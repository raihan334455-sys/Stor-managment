import React, { useEffect, useRef, useState, useId } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  X,
  Camera,
  RefreshCw,
  ImagePlus,
  Volume2,
  VolumeX,
  QrCode,
  Barcode,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  Repeat,
} from 'lucide-react';

interface CameraDevice {
  id: string;
  label: string;
}

export interface ScanResultFeedback {
  status: 'success' | 'not_found';
  message: string;
  code: string;
}

interface QrBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string, formatName?: string) => void;
  title?: string;
  subtitle?: string;
  allowContinuous?: boolean;
  feedback?: ScanResultFeedback | null;
}

const SUPPORTED_FORMATS: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

const playBeepSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // Ignore audio context restriction errors
  }
};

export const QrBarcodeScannerModal: React.FC<QrBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'QR & Barcode Scanner',
  subtitle = 'যেকোনো পণ্যের Barcode অথবা QR Code ক্যামেরার সামনে ধরুন',
  allowContinuous = false,
  feedback = null,
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const regionId = `qr-barcode-reader-${uniqueId}`;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraStatus, setCameraStatus] = useState<'starting' | 'active' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [lastScannedLabel, setLastScannedLabel] = useState<string>('');
  const [retryKey, setRetryKey] = useState<number>(0);

  const soundEnabledRef = useRef(soundEnabled);
  const continuousModeRef = useRef(continuousMode);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  const stopActiveScanner = async () => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    if (!instance) return;
    try {
      const state = instance.getState();
      // 2 = SCANNING, 3 = PAUSED
      if (state === 2 || state === 3) {
        await instance.stop();
      }
    } catch {
      // Ignore stop errors if already stopped
    }
    try {
      instance.clear();
    } catch {
      // Ignore clear errors
    }
  };

  const handleDecoded = (decodedText: string, formatName?: string) => {
    const clean = decodedText.trim();
    if (!clean) return;

    const now = Date.now();
    // Prevent duplicate rapid-fire reads of the same code within 1.6 seconds
    if (lastScanRef.current.text === clean && now - lastScanRef.current.time < 1600) {
      return;
    }
    lastScanRef.current = { text: clean, time: now };

    if (soundEnabledRef.current) {
      playBeepSound();
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(70);
      } catch {
        // ignore
      }
    }

    setLastScannedLabel(formatName ? `${clean} (${formatName})` : clean);
    onScanRef.current(clean, formatName);

    if (!continuousModeRef.current) {
      stopActiveScanner().finally(() => {
        onCloseRef.current();
      });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopActiveScanner();
      return;
    }

    let cancelled = false;
    setCameraStatus('starting');
    setErrorMessage('');
    setLastScannedLabel('');
    lastScanRef.current = { text: '', time: 0 };

    const startScanner = async () => {
      await stopActiveScanner();
      // Small delay so DOM element with regionId is mounted and laid out
      await new Promise((res) => setTimeout(res, 120));
      if (cancelled) return;

      const el = document.getElementById(regionId);
      if (!el) return;

      try {
        if (cameras.length === 0) {
          try {
            const devices = await Html5Qrcode.getCameras();
            if (!cancelled && devices && devices.length > 0) {
              setCameras(
                devices.map((d, idx) => ({
                  id: d.id,
                  label: d.label || `Camera ${idx + 1}`,
                }))
              );
            }
          } catch {
            // Camera enumeration may fail prior to permission grant; fallback to facingMode
          }
        }

        if (cancelled) return;

        const html5QrCode = new Html5Qrcode(regionId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const cameraSource: string | { facingMode: 'environment' | 'user' } = selectedCameraId
          ? selectedCameraId
          : { facingMode };

        await html5QrCode.start(
          cameraSource,
          {
            fps: 12,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const w = Math.max(180, Math.min(300, Math.floor(viewfinderWidth * 0.82)));
              const h = Math.max(130, Math.min(200, Math.floor(viewfinderHeight * 0.65)));
              return { width: w, height: h };
            },
            aspectRatio: 1.333,
          },
          (decodedText, result) => {
            if (cancelled) return;
            const fmt = result?.result?.format?.formatName;
            handleDecoded(decodedText, fmt);
          },
          () => {
            // Ignore per-frame decode misses
          }
        );

        if (cancelled) {
          await stopActiveScanner();
          return;
        }
        setCameraStatus('active');

        // Refresh camera labels after permission is granted
        if (cameras.length === 0) {
          Html5Qrcode.getCameras()
            .then((devices) => {
              if (!cancelled && devices?.length) {
                setCameras(
                  devices.map((d, idx) => ({
                    id: d.id,
                    label: d.label || `Camera ${idx + 1}`,
                  }))
                );
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err || 'Camera unavailable');
        setCameraStatus('error');
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
          setErrorMessage(
            'ক্যামেরা পারমিশন ব্লক করা আছে। ব্রাউজার থেকে Camera Allow করুন অথবা নিচের ছবি আপলোড / ম্যানুয়াল ইনপুট ব্যবহার করুন।'
          );
        } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
          setErrorMessage(
            'এই ডিভাইসে কোনো ক্যামেরা পাওয়া যায়নি। নিচে QR/Barcode ছবি আপলোড করুন অথবা ম্যানুয়ালি কোড লিখুন।'
          );
        } else {
          setErrorMessage(
            `ক্যামেরা চালু করা যায়নি (${msg})। ছবি আপলোড বা ম্যানুয়াল কোড ব্যবহার করতে পারেন।`
          );
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopActiveScanner();
    };
  }, [isOpen, facingMode, selectedCameraId, regionId, retryKey]);

  if (!isOpen) return null;

  const handleToggleCamera = () => {
    if (cameras.length > 1) {
      const currentIdx = cameras.findIndex((c) => c.id === selectedCameraId);
      const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % cameras.length;
      setSelectedCameraId(cameras[nextIdx].id);
    } else {
      setSelectedCameraId('');
      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const tempId = `${regionId}-file-tmp`;
    let tempEl = document.getElementById(tempId);
    if (!tempEl) {
      tempEl = document.createElement('div');
      tempEl.id = tempId;
      tempEl.style.display = 'none';
      document.body.appendChild(tempEl);
    }

    const fileScanner = new Html5Qrcode(tempId, {
      formatsToSupport: SUPPORTED_FORMATS,
      verbose: false,
    });

    try {
      const decodedText = await fileScanner.scanFile(file, false);
      handleDecoded(decodedText, 'Image');
    } catch {
      setErrorMessage('ছবিতে কোনো পরিষ্কার QR বা Barcode পাওয়া যায়নি। পরিষ্কার ছবি দিয়ে আবার চেষ্টা করুন।');
      setCameraStatus((prev) => (prev === 'active' ? 'active' : 'error'));
    } finally {
      try {
        fileScanner.clear();
      } catch {
        // ignore
      }
      tempEl.remove();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    setManualCode('');
    handleDecoded(trimmed, 'Manual');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#5b46b5] to-[#7c3aed] text-white flex items-center justify-between gap-2 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight flex items-center gap-1.5">
                <span>{title}</span>
              </h3>
              <p className="text-[11px] text-white/85 truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              title={soundEnabled ? 'Mute Beep' : 'Enable Beep'}
              className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close scanner"
              className="p-2 rounded-lg bg-white/15 hover:bg-rose-500 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5">
          {/* Supported Formats + Mode Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Barcode className="w-4 h-4 text-[#5b46b5]" />
              <span>QR Code, EAN-13, UPC, Code-128, Code-39</span>
            </div>

            {allowContinuous && (
              <button
                type="button"
                onClick={() => setContinuousMode((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  continuousMode
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>{continuousMode ? 'Multi-Scan: ON' : 'Multi-Scan: OFF'}</span>
              </button>
            )}
          </div>

          {/* Live Camera Viewport */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-[#5b46b5]/30 min-h-[250px] sm:min-h-[280px] flex items-center justify-center">
            <div id={regionId} className="w-full [&_video]:w-full [&_video]:object-cover" />

            {cameraStatus === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white gap-2 p-4 text-center">
                <Camera className="w-8 h-8 text-violet-400 animate-pulse" />
                <p className="text-xs font-semibold">ক্যামেরা চালু হচ্ছে...</p>
                <p className="text-[11px] text-slate-400">অনুগ্রহ করে Camera Permission Allow করুন</p>
              </div>
            )}

            {cameraStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-white gap-3 p-5 text-center">
                <AlertCircle className="w-9 h-9 text-amber-400" />
                <p className="text-xs text-slate-200 leading-relaxed max-w-sm">{errorMessage}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCameraId('');
                      setCameraStatus('starting');
                      setRetryKey((k) => k + 1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#5b46b5] hover:bg-[#4c3a9c] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Upload QR / Barcode Image</span>
                  </button>
                </div>
              </div>
            )}

            {cameraStatus === 'active' && (
              <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/70 text-white text-[10px] font-medium border border-white/15 whitespace-nowrap">
                ফ্রেমের মাঝখানে QR বা Barcode ধরুন
              </div>
            )}
          </div>

          {/* Feedback inside Continuous Mode */}
          {feedback && (
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                feedback.status === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {feedback.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="truncate">{feedback.message}</span>
            </div>
          )}

          {!feedback && lastScannedLabel && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Scanned: {lastScannedLabel}</span>
            </div>
          )}

          {/* Camera Selector & Upload Image Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleToggleCamera}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#5b46b5]" />
              <span>
                {cameras.length > 1
                  ? 'Switch Camera'
                  : facingMode === 'environment'
                  ? 'Front Camera'
                  : 'Back Camera'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-[#5b46b5] text-xs font-semibold flex items-center justify-center gap-1.5 border border-violet-200 transition-colors cursor-pointer"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              <span>Scan from Photo / Gallery</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {cameras.length > 1 && (
            <div>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#5b46b5]"
              >
                <option value="">Auto ({facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'})</option>
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manual Barcode / QR Input Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="অথবা কোড / Barcode লিখুন..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#5b46b5] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 font-mono focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-[#ec1f73] hover:bg-[#d61665] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              Apply
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
