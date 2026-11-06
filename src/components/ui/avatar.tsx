"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import type React from "react";
import { cn } from "@/lib/utils";

const AVATAR_GROUP_CUT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'%3E%3Ccircle cx='1' cy='1' r='1'/%3E%3C/svg%3E\")";

export function Avatar({
  className,
  ...props
}: AvatarPrimitive.Root.Props): React.ReactElement {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative isolate inline-flex size-(--avatar-size,--spacing(8)) shrink-0 select-none items-center justify-center overflow-hidden rounded-full align-middle font-medium text-[calc(var(--avatar-size,--spacing(8))*0.375)]/none",
        className,
      )}
      data-slot="avatar"
      {...props}
    />
  );
}

export function AvatarImage({
  className,
  ...props
}: AvatarPrimitive.Image.Props): React.ReactElement {
  return (
    <AvatarPrimitive.Image
      className={cn(
        "absolute inset-0 z-10 size-full rounded-[inherit] object-cover data-error:invisible data-loading:invisible",
        className,
      )}
      data-slot="avatar-image"
      {...props}
    />
  );
}

const avatarPalettes=[
 ["#30a8a0","#b3d3ff","#287bba"],["#d68eae","#e5d5fa","#a76fae"],
 ["#e3a25e","#ffe4a6","#cf6d86"],["#6c85c8","#d2b8f1","#4fb1b4"],
 ["#75a885","#d3e9ad","#54aab8"],["#c98e6f","#ffdbbc","#ca9dbf"],
];
export function avatarGradient(seed:string):React.CSSProperties{let hash=0;for(let i=0;i<seed.length;i++)hash=(Math.imul(hash,31)+seed.charCodeAt(i))>>>0;const [base,light,accent]=avatarPalettes[hash%avatarPalettes.length];return {backgroundColor:base,backgroundImage:`radial-gradient(ellipse at ${20+hash%45}% -15%, ${light} 0%, transparent 65%), radial-gradient(ellipse at 110% 85%, ${accent} 0%, transparent 70%), linear-gradient(145deg, ${light}, ${base} 65%)`};}
export function AvatarFallback({className,children,seed,style,...props}:AvatarPrimitive.Fallback.Props & {seed?:string}):React.ReactElement{
 const identity=seed??(typeof children==="string"||typeof children==="number"?String(children):"avatar");
 return <AvatarPrimitive.Fallback className={cn("absolute inset-0 flex size-full items-center justify-center rounded-[inherit]",className)} data-slot="avatar-fallback" data-avatar-gradient="true" aria-hidden="true" {...props} style={{...avatarGradient(identity),...(typeof style==="object"?style:{})}}/>;
}

export interface AvatarGroupProps extends React.ComponentProps<"div"> {
  topmost?: "first" | "last";
}

export function AvatarGroup({
  className,
  style,
  topmost = "first",
  ...props
}: AvatarGroupProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex w-fit items-center",
        "[--avatar-group-size:var(--avatar-size,--spacing(8))]",
        "[--avatar-group-gap:var(--avatar-gap,calc(var(--avatar-group-size)/16))]",
        "[--avatar-group-overlap:var(--avatar-overlap,calc(var(--avatar-group-size)*0.3))]",
        "[--avatar-group-cut-end:calc(var(--avatar-group-size)*1.5-var(--avatar-group-overlap))]",
        "[--avatar-group-cut-radius:calc(var(--avatar-group-size)/2+var(--avatar-group-gap))]",
        "[--avatar-group-cut-start:calc(var(--avatar-group-overlap)-var(--avatar-group-size)/2)]",
        "[--avatar-group-mask-position:0_0,calc(var(--avatar-group-cut-x)-var(--avatar-group-cut-radius))_50%]",
        "[--avatar-group-mask-size:100%_100%,calc(var(--avatar-group-cut-radius)*2)_calc(var(--avatar-group-cut-radius)*2)]",
        "[--avatar-group-mask:none]",
        "supports-[mask-composite:subtract]:[--avatar-group-mask:var(--avatar-group-cut-image),var(--avatar-group-cut-image)]",
        "[--avatar-group-nudge:var(--avatar-nudge,calc((var(--avatar-group-overlap)+var(--avatar-group-gap))*0.3))]",
        "*:not-first:-ms-(--avatar-group-overlap)",
        topmost === "first"
          ? "*:not-first:mask-(--avatar-group-mask) *:not-first:mask-subtract *:not-first:mask-position-(--avatar-group-mask-position) *:not-first:mask-no-repeat *:not-first:mask-size-(--avatar-group-mask-size) [--avatar-group-cut-x:var(--avatar-group-cut-start)] *:not-first:*:data-[slot=avatar-fallback]:ps-[calc(var(--avatar-group-nudge)*2)] supports-[mask-composite:subtract]:*:not-first:rounded-none rtl:[--avatar-group-cut-x:var(--avatar-group-cut-end)]"
          : "*:not-last:mask-(--avatar-group-mask) *:not-last:mask-subtract *:not-last:mask-position-(--avatar-group-mask-position) *:not-last:mask-no-repeat *:not-last:mask-size-(--avatar-group-mask-size) [--avatar-group-cut-x:var(--avatar-group-cut-end)] *:not-last:*:data-[slot=avatar-fallback]:pe-[calc(var(--avatar-group-nudge)*2)] supports-[mask-composite:subtract]:*:not-last:rounded-none rtl:[--avatar-group-cut-x:var(--avatar-group-cut-start)]",
        className,
      )}
      data-slot="avatar-group"
      data-topmost={topmost}
      style={
        {
          "--avatar-group-cut-image": AVATAR_GROUP_CUT,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export function AvatarGroupCount({
  children,
  className,
  ...props
}: AvatarPrimitive.Root.Props): React.ReactElement {
  return (
    <Avatar
      className={cn("text-muted-foreground", className)}
      data-slot="avatar-group-count"
      {...props}
    >
      <AvatarPrimitive.Fallback className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-border">{children}</AvatarPrimitive.Fallback>
    </Avatar>
  );
}

export { AvatarPrimitive };
