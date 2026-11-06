import Image from "next/image";
import type {CSSProperties} from "react";

type LogoProps = {className?:string;style?:CSSProperties};
export function SlackMark({className}:LogoProps){return <Image src="/logos/slack.svg" width={20} height={20} alt="" aria-hidden className={className} unoptimized/>;}
export function DiscordMark({className}:LogoProps){return <Image src="/logos/discord.svg" width={20} height={20} alt="" aria-hidden className={className} unoptimized/>;}

export function XMark({className,style}:LogoProps){return <Image src="/logos/x.svg" width={28} height={28} alt="" aria-hidden style={style} className={"object-contain brightness-0 dark:invert "+(className??"")} unoptimized/>;}
export function FacebookMark({className,style}:LogoProps){return <Image src="/logos/facebook.svg" width={28} height={28} alt="" aria-hidden style={style} className={"object-contain brightness-0 dark:invert "+(className??"")} unoptimized/>;}
export function LinkedInMark({className,style}:LogoProps){return <Image src="/logos/linkedin.png" width={28} height={28} alt="" aria-hidden style={style} className={"object-contain "+(className??"")} unoptimized/>;}
export function RedditMark({className,style}:LogoProps){return <Image src="/logos/reddit.png" width={28} height={28} alt="" aria-hidden style={style} className={"object-contain "+(className??"")} unoptimized/>;}
