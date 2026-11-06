"use client";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Widget} from "@/components/feedback/widget";
export function WidgetPreviewButton(){const [preview,setPreview]=useState(0);return <><Button size="sm" variant="outline" className="rounded-full" onClick={()=>setPreview(value=>value+1)}>Preview widget</Button>{preview>0&&<Widget key={preview} defaultOpen/>}</>;}
