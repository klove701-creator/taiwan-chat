import { useState } from "react";
import Login from "./Login.jsx";
import TaiwanApp from "./TaiwanApp.jsx";

export default function App() {
  const [password, setPassword] = useState(
    () => sessionStorage.getItem("tw_pw") || ""
  );

  const handleLogin = (pw) => {
    sessionStorage.setItem("tw_pw", pw);
    setPassword(pw);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("tw_pw");
    setPassword("");
  };

  if (!password) return <Login onLogin={handleLogin} />;
  return <TaiwanApp password={password} onLogout={handleLogout} />;
}
