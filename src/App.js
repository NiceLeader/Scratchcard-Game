import './App.css';
import { useState, useEffect } from "react"
import axios from 'axios'
import MainGame from "./components/MainGame";
import History from "./components/History";
import Timer from "./components/Timer";
import GameEnd from "./components/GameEnd";

import Background from "./assets/images/background.png"
import Logo from "./assets/images/logo.png"
import GameBox from "./assets/images/game-box.png"
import IconBack from "./assets/images/other-icon-back.png"
import MetaMask from "./assets/images/metamask-icon.png"
import Sound from "./assets/images/sound-icon.png"
import Play from "./assets/images/play-icon.png"
import HistoryIcon from "./assets/images/history-icon.png"


const itemName = [
  "You get Legend NFT",
  "You get Rare NFT",
  "You get Common NFT",
  "You get T-shirt",
  "No earn",
];

axios.defaults.baseURL = "http://localhost:8080";

function App() {
  const [gameBoxStatus, setGameBoxStatus] = useState(3);
  const [currentStatus, setStatus] = useState("");
  const [historyList, setHistoryList] = useState([]);
  const [walletAddress, setWalletAddress] = useState("0xc38A8C277F831a881dDC836fE4294B41cc295a9D");
  const [lastTime, setLastTime] = useState("");
  const [playNumber, setPlayNumber] = useState(4);

  useEffect(() => {
    const asyncWalletAddress = async () => {
      if (walletAddress) {
        const response = await axios.get(`time/${walletAddress}`);
        setLastTime(response.data.result);
        setGameBoxStatus(0);
        setPlayNumber(Math.floor(Math.random() * 1000000));
      } else setGameBoxStatus(4);
    };
    asyncWalletAddress();
  }, [walletAddress]);

  useEffect(() => {
    const asyncEffect = async () => {
      const response = await axios.get(`time/${walletAddress}`);
      console.log(response.data.result)
      setLastTime(response.data.result);
      setGameBoxStatus(0);
      setPlayNumber(Math.floor(Math.random() * 1000000));
    };
    asyncEffect();
  }, []);

  const _onPressHistoryButton = async () => {
    try {
      setGameBoxStatus(2);
      const response = await axios.get(`history/${walletAddress}`);
      setHistoryList(response.data.history);
    } catch (error) {
      console.log("error", error);
    }
  };

  const _onPressPlayButton = async () => {
    if (gameBoxStatus === 1) {
    } else {
      const response = await axios.get(`time/${walletAddress}`);
      setLastTime(response.data.result);
      setGameBoxStatus(0);
    }
  };

  const gamefinish = async () => {
    setGameBoxStatus(3);
    let earnThing;
    if (playNumber === 3) earnThing = 0;
    else if (playNumber % 100000 === 0) earnThing = 1;
    else if (playNumber % 10000 === 1) earnThing = 2;
    else if (playNumber % 1000 === 2) earnThing = 3;
    else earnThing = 4;
    try {
      await axios.post("/add", {
        address: walletAddress,
        earn: itemName[earnThing],
        playtime: new Date().toString(),
      });
    } catch (error) {
      console.log("error", error);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-cover bg-center">
      <img src={Background} className="absolute w-full h-full" alt="Background" />
      <img src={Logo} className="absolute left-[3%] top-[2%] w-[12%] h-[13%]" alt="Logo" />
      <img src={GameBox} className="absolute w-[54%] h-[90%] left-[23%] top-[5%]" alt="Game Box" />
      {gameBoxStatus === 0 && <Timer finish={setGameBoxStatus} lasttime={lastTime} />}
      {gameBoxStatus === 1 && <MainGame gamefinish={gamefinish} playnumber={playNumber} />}
      {gameBoxStatus === 2 && <History list={historyList} />}
      {gameBoxStatus === 3 && <GameEnd getearn={playNumber} />}
      <p className="text-white">{currentStatus}</p>
      <button className="absolute w-[15%] h-[15%] top-[50%] left-0">
        <img src={IconBack} className="w-full h-full" alt="Settings" />
        <img src={MetaMask} className="absolute left-[35%] top-[40%] w-[30%] h-[35%]" alt="MetaMask" />
      </button>
      <button className="absolute w-[15%] h-[15%] top-[75%] left-0">
        <img src={IconBack} className="w-full h-full" alt="Sound" />
        <img src={Sound} className="absolute left-[35%] top-[40%] w-[30%] h-[35%]" alt="Sound Icon" />
      </button>
      <button className="absolute w-[20%] h-[18%] top-[45%] right-[2%]" onClick={_onPressPlayButton}>
        <img src={Play} className="w-full h-full" alt="Play" />
      </button>
      <button className="absolute w-[15%] h-[15%] top-[75%] right-0" onClick={_onPressHistoryButton}>
        <img src={IconBack} className="w-full h-full transform rotate-y-180" alt="History" />
        <img src={HistoryIcon} className="absolute left-[35%] top-[40%] w-[30%] h-[35%]" alt="History Icon" />
      </button>
    </div>
  );
}

export default App;
