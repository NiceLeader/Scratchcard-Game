import React, { useState, useEffect } from "react";
// import { useSpring, animated } from 'react-spring'; // For animation in React

const imageUri = [
    require("../assets/images/legend.png"),
    require("../assets/images/rare.png"),
    require("../assets/images/common.png"),
    require("../assets/images/shirt.png"),
    require("../assets/images/gift.png"),
    require("../assets/images/dog.png"),
    require("../assets/images/sidedog.png"),
];

export default function MainGame({ gamefinish, playnumber }) {
    const number = Array.from({ length: 9 }, (_, i) => i);
    const defaultPumpkinState = number.map(() => false);
    const defaultPumpkinNumber = number.map(() => -1);
    const [pumpkinNumber, setPumpkinNumber] = useState(defaultPumpkinNumber);
    const [pumpkinState, setPumpkinState] = useState(defaultPumpkinState);

    // const [flip, setFlip] = useSpring(() => ({ rotateY: '0deg' }));

    // const flipImageAnimation = () => {
    //     setFlip({ rotateY: flip.rotateY.get() === '0deg' ? '180deg' : '0deg' });
    // };

    const generateNums = (index) => {
        let temp = Array(9).fill(-1);
        let result = Array(9).fill(-1);
        for (let i = 0; i < 6; i++) {
            let current;
            do {
                current = Math.floor(Math.random() * 9);
            } while (temp.includes(current));
            temp[i] = current;
        }
        for (let i = 0; i < 6; i++) {
            let cnt = 0;
            let current;
            do {
                current = Math.floor(Math.random() * 7);
                cnt = result.filter(num => num === current).length;
            } while (cnt === 2 || current === index);
            result[temp[i]] = current;
        }
        for (let i = 0; i < 9; i++) if (result[i] === -1) result[i] = index;
        return result;
    };

    const generateDefaultNums = () => {
        let result = Array(9).fill(-1);
        for (let i = 0; i < 9; i++) {
            let cnt = 0;
            let current;
            do {
                current = Math.floor(Math.random() * 7);
                cnt = result.filter(num => num === current).length;
            } while (cnt === 2);
            result[i] = current;
        }
        return result;
    };

    const setGame = () => {
        let res;
        if (playnumber === 3) {
            res = generateNums(0);
        } else if (playnumber % 100000 === 0) {
            res = generateNums(1);
        } else if (playnumber % 10000 === 1) {
            res = generateNums(2);
        } else if (playnumber % 1000 === 2) {
            res = generateNums(3);
        } else {
            res = generateDefaultNums();
        }
        setPumpkinNumber(res);
    };

    const clickPumpkin = async (index) => {
        // flipImageAnimation();
        const newPumpkinState = [...pumpkinState];
        newPumpkinState[index] = true;
        if (newPumpkinState.filter(item => item).length === 9) {
            gamefinish();
        }
        setPumpkinState(newPumpkinState);
    };

    useEffect(() => {
        setGame();
    }, [playnumber]);

    return (
        <div className="flex flex-wrap justify-center items-center w-[40%] h-[60%] absolute left-[30%] top-[20%] p-[1%]">
            {number.map((i) => (
                <div
                    className="w-[30%] h-[30%] m-1 cursor-pointer"
                    key={i}
                    onClick={() => clickPumpkin(i)}
                >
                    {/* {pumpkinState[i] === false ? (
                        <animated.img
                            src={require("../assets/images/pumpkin.png")}
                            alt="Pumpkin"
                            style={{ transform: flip.rotateY }}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <img
                            src={imageUri[pumpkinNumber[i]]}
                            alt="Pumpkin Image"
                            className="w-full h-full object-cover"
                        />
                    )} */}
                    {pumpkinState[i] === false ? (
                        <img
                            src={require("../assets/images/pumpkin.png")}
                            alt="Pumpkin"
                            // style={{ transform: flip.rotateY }}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <img
                            src={imageUri[pumpkinNumber[i]]}
                            alt="Pumpkin Image"
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>
            ))}
        </div>
    );
}