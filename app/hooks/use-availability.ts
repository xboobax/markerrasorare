"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {nextRefreshMs,type AvailabilitySnapshot} from "@/lib/availability";
import type {Sport} from "@/lib/model";

type State={data:AvailabilitySnapshot|null;loading:boolean;error:string;changes:string[]};
const EMPTY:State={data:null,loading:false,error:"",changes:[]};

/** When the page is visible, refresh more frequently close to a known kickoff.
 * Never claims background monitoring/push or provider-level real-time updates. */
export function useAvailability(sport:Sport,league:string,tipoffs:(string|undefined)[]){
  const [state,setState]=useState<State>(EMPTY);
  const [clock,setClock]=useState(0);
  const requestRef=useRef<AbortController|null>(null);
  const lastAttempt=useRef<number>(0);
  const previous=useRef<AvailabilitySnapshot|null>(null);
  const timesRef=useRef(tipoffs);
  timesRef.current=tipoffs;
  const load=useCallback(async(force=false)=>{
    if(typeof document!=="undefined"&&document.hidden&&!force)return;
    if(requestRef.current)return;
    const now=Date.now(),minimum=nextRefreshMs(new Date(now),timesRef.current);
    if(!force&&now-lastAttempt.current<minimum)return;
    lastAttempt.current=now;
    const controller=new AbortController();requestRef.current=controller;
    setState(s=>({...s,loading:true,error:""}));
    try{
      const response=await fetch(`/api/availability?sport=${encodeURIComponent(sport)}&league=${encodeURIComponent(league||"__all")}`,{cache:"no-store",signal:controller.signal});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data:AvailabilitySnapshot=await response.json();
      if(controller.signal.aborted)return;
      if(!Array.isArray(data.reports)||typeof data.fetchedAt!=="string")throw new Error("Ungültige Providerdaten");
      const changes:string[]=[];
      if(previous.current){
        const old=new Map(previous.current.reports.map(r=>[`${r.name.toLowerCase()}:${r.team.toLowerCase()}`,r.status]));
        for(const report of data.reports){
          const key=`${report.name.toLowerCase()}:${report.team.toLowerCase()}`;
          const prev=old.get(key);
          if(prev&&prev!==report.status&&(report.status==="out"||report.status==="doubtful"))changes.push(`${report.name}: ${report.status.toUpperCase()}`);
        }
      }
      previous.current=data;
      setState({data,loading:false,error:data.status==="unavailable"?"Keine Quelle erreichbar. Status unbekannt.":"",changes:changes.slice(0,10)});
    }catch(error){
      if(!controller.signal.aborted)setState(s=>({...s,loading:false,error:error instanceof Error?error.message:"Verletzungsdaten nicht abrufbar",changes:[]}));
    }finally{if(requestRef.current===controller)requestRef.current=null;}
  },[sport,league]);
  useEffect(()=>{
    previous.current=null;lastAttempt.current=0;
    requestRef.current?.abort();requestRef.current=null;
    setState(EMPTY);
    void load(true);
    const timer=window.setInterval(()=>{setClock(Date.now());void load(false);},60_000);
    const focus=()=>{setClock(Date.now());void load(false);};
    window.addEventListener("focus",focus);document.addEventListener("visibilitychange",focus);
    return()=>{window.clearInterval(timer);window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",focus);requestRef.current?.abort();requestRef.current=null;};
  },[load]);
  const refresh=()=>{setClock(Date.now());void load(true);};
  return {...state,refresh,intervalMs:nextRefreshMs(new Date(clock||Date.now()),tipoffs)};
}
