#include "recorder.h"

#include <libavutil/time.h>
#include <SDL2/SDL_assert.h>

#include "config.h"
#include "log.h"

// In ffmpeg/doc/APIchanges:
// 2016-04-11 - 6f69f7a / 9200514 - lavf 57.33.100 / 57.5.0 - avformat.h
//   Add AVStream.codecpar, deprecate AVStream.codec.
#if    (LIBAVFORMAT_VERSION_MICRO >= 100 /* FFmpeg */ && \
        LIBAVFORMAT_VERSION_INT >= AV_VERSION_INT(57, 33, 100)) \
    || (LIBAVFORMAT_VERSION_MICRO < 100 && /* Libav */ \
        LIBAVFORMAT_VERSION_INT >= AV_VERSION_INT(57, 5, 0))
# define LAVF_NEW_CODEC_API
#endif

static const AVRational SCRCPY_TIME_BASE = {1, 1000000}; // timestamps in us

static const AVOutputFormat *find_muxer(const char *name) {
#if LIBAVFORMAT_VERSION_INT >= AV_VERSION_INT(58, 9, 100)
    void *opaque = NULL;
#endif
    const AVOutputFormat *oformat = NULL;
    do {
#if LIBAVFORMAT_VERSION_INT >= AV_VERSION_INT(58, 9, 100)
        oformat = av_muxer_iterate(&opaque);
#else
        oformat = av_oformat_next(oformat);
#endif
        // until null or with name "mp4"
    } while (oformat && strcmp(oformat->name, name));
    return oformat;
}

SDL_bool recorder_init(struct recorder *recorder,
                       const char *filename,
                       enum recorder_format format,
                       struct size declared_frame_size) {
    recorder->filename = SDL_strdup(filename);
    if (!recorder->filename) {
        LOGE("Cannot strdup filename");
        return SDL_FALSE;
    }

    recorder->format = format;
    recorder->declared_frame_size = declared_frame_size;
    recorder->header_written = SDL_FALSE;

    return SDL_TRUE;
}

void recorder_destroy(struct recorder *recorder) {
    SDL_free(recorder->filename);
}

static const char *
recorder_get_format_name(enum recorder_format format) {
    switch (format) {
        case RECORDER_FORMAT_MP4: return "mp4";
        case RECORDER_FORMAT_MKV: return "matroska";
        default: return NULL;
    }
}

SDL_bool recorder_open(struct recorder *recorder, AVCodec *input_codec) {
    const char *format_name = recorder_get_format_name(recorder->format);
    SDL_assert(format_name);
    const AVOutputFormat *format = find_muxer(format_name);
    if (!format) {
        LOGE("Could not find muxer");
        return SDL_FALSE;
    }

    recorder->ctx = avformat_alloc_context();
    if (!recorder->ctx) {
        LOGE("Could not allocate output context");
        return SDL_FALSE;
    }

    // contrary to the deprecated API (av_oformat_next()), av_muxer_iterate()
    // returns (on purpose) a pointer-to-const, but AVFormatContext.oformat
    // still expects a pointer-to-non-const (it has not be updated accordingly)
    // <https://github.com/FFmpeg/FFmpeg/commit/0694d8702421e7aff1340038559c438b61bb30dd>
    recorder->ctx->oformat = (AVOutputFormat *) format;

    AVStream *ostream = avformat_new_stream(recorder->ctx, input_codec);
    if (!ostream) {
        avformat_free_context(recorder->ctx);
        return SDL_FALSE;
    }

#ifdef LAVF_NEW_CODEC_API
    ostream->codecpar->codec_type = AVMEDIA_TYPE_VIDEO;
    ostream->codecpar->codec_id = input_codec->id;
    ostream->codecpar->format = AV_PIX_FMT_YUV420P;
    ostream->codecpar->width = recorder->declared_frame_size.width;
    ostream->codecpar->height = recorder->declared_frame_size.height;
#else
    ostream->codec->codec_type = AVMEDIA_TYPE_VIDEO;
    ostream->codec->codec_id = input_codec->id;
    ostream->codec->pix_fmt = AV_PIX_FMT_YUV420P;
    ostream->codec->width = recorder->declared_frame_size.width;
    ostream->codec->height = recorder->declared_frame_size.height;
#endif

    int ret = avio_open(&recorder->ctx->pb, recorder->filename,
                        AVIO_FLAG_WRITE);
    if (ret < 0) {
        LOGE("Failed to open output file: %s", recorder->filename);
        // ostream will be cleaned up during context cleaning
        avformat_free_context(recorder->ctx);
        return SDL_FALSE;
    }

    LOGI("Recording started to %s file: %s", format_name, recorder->filename);

    return SDL_TRUE;
}

void recorder_close(struct recorder *recorder) {
    int ret = av_write_trailer(recorder->ctx);
    if (ret < 0) {
        LOGE("Failed to write trailer to %s", recorder->filename);
    }
    avio_close(recorder->ctx->pb);
    avformat_free_context(recorder->ctx);

    const char *format_name = recorder_get_format_name(recorder->format);
    LOGI("Recording complete to %s file: %s", format_name, recorder->filename);
}

static SDL_bool
recorder_write_header(struct recorder *recorder, AVPacket *packet) {
    AVStream *ostream = recorder->ctx->streams[0];

    uint8_t *extradata = SDL_malloc(packet->size * sizeof(uint8_t));
    if (!extradata) {
        LOGC("Cannot allocate extradata");
        return SDL_FALSE;
    }

    // copy the first packet to the extra data
    memcpy(extradata, packet->data, packet->size);

#ifdef LAVF_NEW_CODEC_API
    ostream->codecpar->extradata = extradata;
    ostream->codecpar->extradata_size = packet->size;
#else
    ostream->codec->extradata = extradata;
    ostream->codec->extradata_size = packet->size;
#endif

    int ret = avformat_write_header(recorder->ctx, NULL);
    if (ret < 0) {
        LOGE("Failed to write header to %s", recorder->filename);
        SDL_free(extradata);
        avio_closep(&recorder->ctx->pb);
        avformat_free_context(recorder->ctx);
        return SDL_FALSE;
    }

    return SDL_TRUE;
}

static void
recorder_rescale_packet(struct recorder *recorder, AVPacket *packet) {
    AVStream *ostream = recorder->ctx->streams[0];
    av_packet_rescale_ts(packet, SCRCPY_TIME_BASE, ostream->time_base);
}

SDL_bool recorder_write(struct recorder *recorder, AVPacket *packet) {
    if (!recorder->header_written) {
        SDL_bool ok = recorder_write_header(recorder, packet);
        if (!ok) {
            return SDL_FALSE;
        }
        recorder->header_written = SDL_TRUE;
    }

    recorder_rescale_packet(recorder, packet);
    return av_write_frame(recorder->ctx, packet) >= 0;
}
