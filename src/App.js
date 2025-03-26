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

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setWalletAddress(accounts[0]);
        setStatus("Portfel podłączony!");
        
        window.ethereum.on("accountsChanged", (accounts) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          } else {
            setWalletAddress("");
            setStatus("Portfel odłączony");
          }
        });
        
        window.ethereum.on("chainChanged", (chainId) => {
          if (chainId !== "0x1") {
            setStatus("Proszę połączyć się z siecią główną Ethereum!");
          }
        });
        
        window.ethereum.on("disconnect", () => {
          setStatus("Odłączono od MetaMask!");
          setWalletAddress("");
        });
      } else {
        setStatus("Proszę zainstalować MetaMask!");
      }
    } catch (error) {
      console.log("Błąd:", error);
      setStatus("Błąd podczas łączenia z portfelem");
    }
  };

  useEffect(() => {
    const asyncWalletAddress = async () => {
      if (walletAddress) {
        try {
          const response = await axios.get(`time/${walletAddress}`);
          setLastTime(response.data.result);
          setGameBoxStatus(0);
          setPlayNumber(Math.floor(Math.random() * 1000000));
        } catch (error) {
          console.log("Błąd podczas pobierania czasu:", error);
          setStatus("Błąd serwera. Sprawdź czy serwer jest uruchomiony.");
          // Ustawiamy domyślne dane, aby aplikacja mogła działać mimo błędu
          setLastTime(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString());
          setGameBoxStatus(0);
        }
      } else setGameBoxStatus(4);
    };
    asyncWalletAddress();
  }, [walletAddress]);

  useEffect(() => {
    const asyncEffect = async () => {
      if (walletAddress) {
        try {
          const response = await axios.get(`time/${walletAddress}`);
          console.log(response.data.result);
          setLastTime(response.data.result);
          setGameBoxStatus(0);
          setPlayNumber(Math.floor(Math.random() * 1000000));
        } catch (error) {
          console.log("Błąd podczas pobierania czasu:", error);
          setStatus("Błąd serwera. Sprawdź czy serwer jest uruchomiony.");
          // Ustawiamy domyślne dane, aby aplikacja mogła działać mimo błędu
          setLastTime(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString());
          setGameBoxStatus(0);
        }
      }
    };
    asyncEffect();
  }, []);

  const _onPressHistoryButton = async () => {
    try {
      setGameBoxStatus(2);
      const response = await axios.get(`history/${walletAddress}`);
      setHistoryList(response.data.history);
    } catch (error) {
      console.log("Błąd podczas pobierania historii:", error);
      setStatus("Nie udało się pobrać historii. Sprawdź serwer.");
      // Ustawiamy pustą historię, aby nie wyświetlał się błąd
      setHistoryList([]);
    }
  };

  const _onPressPlayButton = async () => {
    if (gameBoxStatus === 1) {
    } else {
      try {
        const response = await axios.get(`time/${walletAddress}`);
        setLastTime(response.data.result);
        setGameBoxStatus(0);
      } catch (error) {
        console.log("Błąd podczas pobierania czasu:", error);
        setStatus("Błąd serwera. Sprawdź czy serwer jest uruchomiony.");
        // Ustawiamy domyślne dane, aby aplikacja mogła działać mimo błędu
        setLastTime(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString());
        setGameBoxStatus(0);
      }
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
      console.log("Błąd podczas zapisywania wyników:", error);
      setStatus("Nie udało się zapisać wyników. Sprawdź serwer.");
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
      <button className="absolute w-[15%] h-[15%] top-[50%] left-0" onClick={connectWallet}>
        <img src={IconBack} className="w-full h-full" alt="Settings" />
        <img src={MetaMask} className="absolute left-[35%] top-[40%] w-[30%] h-[35%]" alt="MetaMask" />
        {walletAddress && <div className="absolute top-[15%] right-[15%] w-[20%] h-[20%] bg-green-500 rounded-full"></div>}
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
