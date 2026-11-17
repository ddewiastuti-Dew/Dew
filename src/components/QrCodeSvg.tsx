import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeSvgProps {
  value: string;
  size?: number;
}

export default function QrCodeSvg({ value, size = 112 }: QrCodeSvgProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 1,
      color: {
        dark: '#1E3A8A',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {
        if (active) setSvgMarkup('');
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!svgMarkup) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-slate-400"
      >
        QR
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="overflow-hidden rounded-lg border border-slate-200 bg-white p-1"
      aria-label={`Kode QR Tiket ${value}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
