import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OdemeTestYillik() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/odeme-test?periyot=yillik", { replace: true });
  }, [navigate]);
  return null;
}
