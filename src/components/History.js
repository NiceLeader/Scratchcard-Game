import React from "react";

export default function History(props) {
    const { list } = props;
    return (
        <div className="absolute w-2/5 left-1/3 top-1/5 p-1">
            <div className="grid grid-cols-2">
                <div className="col-span-2 md:col-span-1 border-r border-white">
                    <div className="border-b border-white flex justify-center items-center p-4">
                        <span className="text-yellow-400 text-lg">Earn</span>
                    </div>
                    {list.length &&
                        list.map((item, index) => (
                            <div key={index} className="border-b border-white flex justify-center items-center p-4">
                                <span className="text-white text-base">{item.earn}</span>
                            </div>
                        ))}
                </div>
                <div className="col-span-2 md:col-span-1">
                    <div className="border-b border-white flex justify-center items-center p-4">
                        <span className="text-green-400 text-lg">Time</span>
                    </div>
                    {list.length &&
                        list.map((item, index) => {
                            let temp = new Date(item.playtime);
                            let time =
                                temp.getFullYear() +
                                "/" +
                                (temp.getMonth() + 1) +
                                "/" +
                                temp.getDate() +
                                " " +
                                temp.getHours() +
                                ":" +
                                temp.getMinutes() +
                                ":" +
                                temp.getSeconds();
                            return (
                                <div key={index} className="border-b border-white flex justify-center items-center p-4">
                                    <span className="text-white text-base">{time}</span>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}