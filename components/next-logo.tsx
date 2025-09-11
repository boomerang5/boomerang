// components/ui/next-logo.tsx
import Image from "next/image";
import logo from "@/public/boomerang.png"; // <-- archivo en /public/boomerang.png

type Props = { className?: string };

export default function NextLogo({ className = "" }: Props) {
  return (
    <Image
      src={logo}
      alt="Boomerang"
      priority
      className={`h-6 w-auto md:h-7 ${className}`}
    />
  );
}
