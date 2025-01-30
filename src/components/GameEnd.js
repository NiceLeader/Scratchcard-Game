import React from "react";
import { useState, useEffect } from "react";

const imageUri = [
  "/images/legend.png",
  "/images/rare.png",
  "/images/common.png",
  "/images/shirt.png",
  "/images/empty.png",
];
const itemName = [
  "You get Legend NFT",
  "You get Rare NFT",
  "You get Common NFT",
  "You get T-shirt",
  "Ooops.. Try again",
];

export default function GameEnd({ getearn }) {
  const [earnNumber, setEarnNumber] = useState();
  useEffect(() => {
    const asyncGetEarn = async () => {
      if (getearn === 3) setEarnNumber(0);
      else if (getearn % 100000 === 0) setEarnNumber(1);
      else if (getearn % 10000 === 1) setEarnNumber(2);
      else if (getearn % 1000 === 2) setEarnNumber(3);
      else setEarnNumber(4);
    };
    asyncGetEarn();
  }, [getearn]);
  return (
    <div className="flex flex-col items-center justify-center absolute w-2/5 h-3/5 left-1/4 top-1/5 p-2">
      <div className="w-2/5 h-2/5">
        <img
          src={imageUri[earnNumber]}
          alt={itemName[earnNumber]}
          layout="responsive"
          width={500} // Adjust width as needed
          height={500} // Adjust height as needed
        />
      </div>
      {itemName[earnNumber] && (
        <p className="text-white text-xl">{itemName[earnNumber]}</p>
      )}
      <p className="text-green-400 text-base">Good luck for the next time.</p>
    </div>
  );
}