#include "v4l2_sink.h"

#include "util/log.h"
#include "util/str_util.h"

/** Downcast frame_sink to sc_v4l2_sink */
#define DOWNCAST(SINK) container_of(SINK, struct sc_v4l2_sink, frame_sink)

static const AVRational SCRCPY_TIME_BASE = {1, 1000000}; // timestamps in us

static const AVOutputFormat *
find_muxer(const char *name) {
#ifdef SCRCPY_LAVF_HAS_NEW_MUXER_ITERATOR_API
    void *opaque = NULL;
#endif
    const AVOutputFormat *oformat = NULL;
    do {
#ifdef SCRCPY_LAVF_HAS_NEW_MUXER_ITERATOR_API
        oformat = av_muxer_iterate(&opaque);
#else
        oformat = av_oformat_next(oformat);
#endif
        // until null or containing the requested name
    } while (oformat && !strlist_contains(oformat->name, ',', name));
    return oformat;
}

static bool
write_header(struct sc_v4l2_sink *vs, const AVPacket *packet) {
    AVStream *ostream = vs->format_ctx->streams[0];

    uint8_t *extradata = av_malloc(packet->size * sizeof(uint8_t));
    if (!extradata) {
        LOGC("Could not allocate extradata");
        return false;
    }

    // copy the first packet to the extra data
    memcpy(extradata, packet->data, packet->size);

    ostream->codecpar->extradata = extradata;
    ostream->codecpar->extradata_size = packet->size;

    int ret = avformat_write_header(vs->format_ctx, NULL);
    if (ret < 0) {
        LOGE("Failed to write header to %s", vs->device_name);
        return false;
    }

    return true;
}

static void
rescale_packet(struct sc_v4l2_sink *vs, AVPacket *packet) {
    AVStream *ostream = vs->format_ctx->streams[0];
    av_packet_rescale_ts(packet, SCRCPY_TIME_BASE, ostream->time_base);
}

static bool
write_packet(struct sc_v4l2_sink *vs, AVPacket *packet) {
    if (!vs->header_written) {
        bool ok = write_header(vs, packet);
        if (!ok) {
            return false;
        }
        vs->header_written = true;
        return true;
    }

    rescale_packet(vs, packet);

    bool ok = av_write_frame(vs->format_ctx, packet) >= 0;

    // Failing to write the last frame is not very serious, no future frame may
    // depend on it, so the resulting file will still be valid
    (void) ok;

    return true;
}

static bool
encode_and_write_frame(struct sc_v4l2_sink *vs, const AVFrame *frame) {
    int ret = avcodec_send_frame(vs->encoder_ctx, frame);
    if (ret < 0 && ret != AVERROR(EAGAIN)) {
        LOGE("Could not send v4l2 video frame: %d", ret);
        return false;
    }

    AVPacket *packet = &vs->packet;
    ret = avcodec_receive_packet(vs->encoder_ctx, packet);
    if (ret == 0) {
        // A packet was received

        bool ok = write_packet(vs, packet);
        if (!ok) {
            LOGW("Could not send packet to v4l2 sink");
            return false;
        }
        av_packet_unref(packet);
    } else if (ret != AVERROR(EAGAIN)) {
        LOGE("Could not receive v4l2 video packet: %d", ret);
        return false;
    }

    return true;
}

static int
run_v4l2_sink(void *data) {
    struct sc_v4l2_sink *vs = data;

    for (;;) {
        sc_mutex_lock(&vs->mutex);

        while (!vs->stopped && vs->vb.pending_frame_consumed) {
            sc_cond_wait(&vs->cond, &vs->mutex);
        }

        if (vs->stopped) {
            sc_mutex_unlock(&vs->mutex);
            break;
        }

        sc_mutex_unlock(&vs->mutex);

        video_buffer_consume(&vs->vb, vs->frame);
        bool ok = encode_and_write_frame(vs, vs->frame);
        av_frame_unref(vs->frame);
        if (!ok) {
            LOGE("Could not send frame to v4l2 sink");
            break;
        }
    }

    LOGD("V4l2 thread ended");

    return 0;
}

static bool
sc_v4l2_sink_open(struct sc_v4l2_sink *vs) {
    bool ok = video_buffer_init(&vs->vb);
    if (!ok) {
        return false;
    }

    ok = sc_mutex_init(&vs->mutex);
    if (!ok) {
        LOGC("Could not create mutex");
        goto error_video_buffer_destroy;
    }

    ok = sc_cond_init(&vs->cond);
    if (!ok) {
        LOGC("Could not create cond");
        goto error_mutex_destroy;
    }

    // FIXME
    const AVOutputFormat *format = find_muxer("video4linux2,v4l2");
    if (!format) {
        LOGE("Could not find v4l2 muxer");
        goto error_cond_destroy;
    }

    const AVCodec *encoder = avcodec_find_encoder(AV_CODEC_ID_RAWVIDEO);
    if (!encoder) {
        LOGE("Raw video encoder not found");
        return false;
    }

    vs->format_ctx = avformat_alloc_context();
    if (!vs->format_ctx) {
        LOGE("Could not allocate v4l2 output context");
        return false;
    }

    // contrary to the deprecated API (av_oformat_next()), av_muxer_iterate()
    // returns (on purpose) a pointer-to-const, but AVFormatContext.oformat
    // still expects a pointer-to-non-const (it has not be updated accordingly)
    // <https://github.com/FFmpeg/FFmpeg/commit/0694d8702421e7aff1340038559c438b61bb30dd>
    vs->format_ctx->oformat = (AVOutputFormat *) format;
    vs->format_ctx->url = strdup(vs->device_name);
    if (!vs->format_ctx->url) {
        LOGE("Could not strdup v4l2 device name");
        goto error_avformat_free_context;
        return false;
    }

    AVStream *ostream = avformat_new_stream(vs->format_ctx, encoder);
    if (!ostream) {
        LOGE("Could not allocate new v4l2 stream");
        goto error_avformat_free_context;
        return false;
    }

    ostream->codecpar->codec_type = AVMEDIA_TYPE_VIDEO;
    ostream->codecpar->codec_id = encoder->id;
    ostream->codecpar->format = AV_PIX_FMT_YUV420P;
    ostream->codecpar->width = vs->frame_size.width;
    ostream->codecpar->height = vs->frame_size.height;

    int ret = avio_open(&vs->format_ctx->pb, vs->device_name, AVIO_FLAG_WRITE);
    if (ret < 0) {
        LOGE("Failed to open output device: %s", vs->device_name);
        // ostream will be cleaned up during context cleaning
        goto error_avformat_free_context;
    }

    vs->encoder_ctx = avcodec_alloc_context3(encoder);
    if (!vs->encoder_ctx) {
        LOGC("Could not allocate codec context for v4l2");
        goto error_avio_close;
    }

    vs->encoder_ctx->width = vs->frame_size.width;
    vs->encoder_ctx->height = vs->frame_size.height;
    vs->encoder_ctx->pix_fmt = AV_PIX_FMT_YUV420P;
    vs->encoder_ctx->time_base.num = 1;
    vs->encoder_ctx->time_base.den = 1;

    if (avcodec_open2(vs->encoder_ctx, encoder, NULL) < 0) {
        LOGE("Could not open codec for v4l2");
        goto error_avcodec_free_context;
    }

    vs->frame = av_frame_alloc();
    if (!vs->frame) {
        LOGE("Could not create v4l2 frame");
        goto error_avcodec_close;
    }

    LOGD("Starting v4l2 thread");
    ok = sc_thread_create(&vs->thread, run_v4l2_sink, "v4l2", vs);
    if (!ok) {
        LOGC("Could not start v4l2 thread");
        goto error_av_frame_free;
    }

    vs->header_written = false;
    vs->stopped = false;

    LOGI("v4l2 sink started to device: %s", vs->device_name);

    return true;

error_av_frame_free:
    av_frame_free(&vs->frame);
error_avcodec_close:
    avcodec_close(vs->encoder_ctx);
error_avcodec_free_context:
    avcodec_free_context(&vs->encoder_ctx);
error_avio_close:
    avio_close(vs->format_ctx->pb);
error_avformat_free_context:
    avformat_free_context(vs->format_ctx);
error_cond_destroy:
    sc_cond_destroy(&vs->cond);
error_mutex_destroy:
    sc_mutex_destroy(&vs->mutex);
error_video_buffer_destroy:
    video_buffer_destroy(&vs->vb);

    return false;
}

static void
sc_v4l2_sink_close(struct sc_v4l2_sink *vs) {
    sc_mutex_lock(&vs->mutex);
    vs->stopped = true;
    sc_cond_signal(&vs->cond);
    sc_mutex_unlock(&vs->mutex);

    sc_thread_join(&vs->thread, NULL);

    av_frame_free(&vs->frame);
    avcodec_close(vs->encoder_ctx);
    avcodec_free_context(&vs->encoder_ctx);
    avio_close(vs->format_ctx->pb);
    avformat_free_context(vs->format_ctx);
    sc_cond_destroy(&vs->cond);
    sc_mutex_destroy(&vs->mutex);
    video_buffer_destroy(&vs->vb);
}

static bool
sc_v4l2_sink_push(struct sc_v4l2_sink *vs, const AVFrame *frame) {
    bool ok = video_buffer_push(&vs->vb, frame, NULL);
    if (!ok) {
        return false;
    }

    // signal possible change of vs->vb.pending_frame_consumed
    sc_cond_signal(&vs->cond);

    return true;
}

static bool
sc_v4l2_frame_sink_open(struct sc_frame_sink *sink) {
    struct sc_v4l2_sink *vs = DOWNCAST(sink);
    return sc_v4l2_sink_open(vs);
}

static void
sc_v4l2_frame_sink_close(struct sc_frame_sink *sink) {
    struct sc_v4l2_sink *vs = DOWNCAST(sink);
    sc_v4l2_sink_close(vs);
}

static bool
sc_v4l2_frame_sink_push(struct sc_frame_sink *sink, const AVFrame *frame) {
    struct sc_v4l2_sink *vs = DOWNCAST(sink);
    return sc_v4l2_sink_push(vs, frame);
}

bool
sc_v4l2_sink_init(struct sc_v4l2_sink *vs, const char *device_name,
                  struct size frame_size) {
    vs->device_name = strdup(device_name);
    if (!vs->device_name) {
        LOGE("Could not strdup v4l2 device name");
        return false;
    }

    vs->frame_size = frame_size;

    static const struct sc_frame_sink_ops ops = {
        .open = sc_v4l2_frame_sink_open,
        .close = sc_v4l2_frame_sink_close,
        .push = sc_v4l2_frame_sink_push,
    };

    vs->frame_sink.ops = &ops;

    return true;
}

void
sc_v4l2_sink_destroy(struct sc_v4l2_sink *vs) {
    free(vs->device_name);
}
