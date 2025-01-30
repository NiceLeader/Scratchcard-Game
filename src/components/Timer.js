import React, { useState, useEffect } from "react";

export default function Timer({ finish, lasttime }) {
    const useCountdown = () => {
        const countDownDate = new Date(lasttime).getTime();
        console.log(countDownDate)

        const [countDown, setCountDown] = useState(
            new Date().getTime() - countDownDate
        );
        useEffect(() => {
            const interval = setInterval(() => {
                setCountDown(new Date().getTime() - countDownDate);
            }, 1000);

            return () => clearInterval(interval);
        }, [countDownDate]);

        return getReturnValues(countDown);
    };
    const getReturnValues = (countDown) => {
        const days = Math.floor(countDown / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
            (countDown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((countDown % (1000 * 60)) / 1000);

        return [days, hours, minutes, seconds];
    };
    const [days, hours, minutes, seconds] = useCountdown();
    if (days >= 1) {
        finish(1);
    }

    return (
        <div className="flex w-full absolute text-center justify-center items-center p-10">
            <div className="flex w-[50%] gap-2 justify-center">
                <span className="text-7xl bg-yellow-400 p-2 rounded-md m-2">
                    {`${hours > 9 ? hours : "0" + hours}`}
                </span>
                <span className="text-7xl bg-yellow-400 p-2 rounded-md m-2">
                    {`${minutes > 9 ? minutes : "0" + minutes}`}
                </span>
                <span className="text-7xl bg-yellow-400 p-2 rounded-md m-2">
                    {`${seconds > 9 ? seconds : "0" + seconds}`}
                </span>
            </div>
        </div>
    );
}