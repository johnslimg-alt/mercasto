import { useEffect, useState } from "react";
export default function SimpleToastViewport(){
  const [msg,setMsg]=useState("");
  useEffect(()=>{
    let timer; const fn=(e)=>{ setMsg(e.detail?.description||""); clearTimeout(timer); timer=setTimeout(()=>setMsg(""),2600); };
    window.addEventListener("mercasto:toast",fn); return()=>{window.removeEventListener("mercasto:toast",fn);clearTimeout(timer);};
  },[]);
  if(!msg) return null;
  return <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] rounded-lg bg-foreground text-background px-4 py-2 text-sm shadow-lg">{msg}</div>;
}
