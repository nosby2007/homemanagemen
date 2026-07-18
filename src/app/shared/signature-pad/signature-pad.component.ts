import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sig">
      <canvas
        #canvas
        class="canvas"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp()"
        (pointercancel)="onPointerUp()"
        (pointerleave)="onPointerUp()"
      ></canvas>
      <div class="hint">Use your mouse or touch to sign. Click Clear to reset.</div>
    </div>
  `,
  styles: [`
    .sig{ width:100%; }
    .canvas{
      width:100%;
      height:180px;
      border-radius:14px;
      background: rgba(2,6,23,.35);
      border:1px solid rgba(255,255,255,.08);
      touch-action:none;
    }
    .hint{ margin-top:8px; color:#94a3b8; font-size:12px; }
  `]
})
export class SignaturePadComponent implements AfterViewInit {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;

  ngAfterViewInit(): void {
    this.resizeCanvas();
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.configure();
    this.clear();

    // Keep crisp on resize
    window.addEventListener('resize', () => {
      const data = this.exportDataUrl();
      this.resizeCanvas();
      this.configure();
      this.clear();
      // Attempt to redraw previous signature
      if (data && !this.isBlankDataUrl(data)) {
        const img = new Image();
        img.onload = () => {
          this.ctx.drawImage(img, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
        };
        img.src = data;
      }
    });
  }

  private configure() {
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#ffffff';
  }

  private resizeCanvas() {
    const el = this.canvas.nativeElement;
    const rect = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.max(1, Math.floor(rect.width * dpr));
    el.height = Math.max(1, Math.floor(rect.height * dpr));
  }

  clear() {
    const el = this.canvas.nativeElement;
    this.ctx.clearRect(0, 0, el.width, el.height);
  }

  exportDataUrl(): string {
    return this.canvas.nativeElement.toDataURL('image/png');
  }

  isBlank(): boolean {
    const data = this.exportDataUrl();
    return this.isBlankDataUrl(data);
  }

  private isBlankDataUrl(dataUrl: string): boolean {
    // Quick check: blank canvas tends to be very small; avoids heavy pixel scans.
    return (dataUrl?.length ?? 0) < 2500;
  }

  onPointerDown(evt: PointerEvent) {
    this.drawing = true;
    const { x, y } = this.getCanvasPoint(evt);
    this.lastX = x;
    this.lastY = y;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  onPointerMove(evt: PointerEvent) {
    if (!this.drawing) return;
    const { x, y } = this.getCanvasPoint(evt);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.lastX = x;
    this.lastY = y;
  }

  onPointerUp() {
    if (!this.drawing) return;
    this.drawing = false;
    this.ctx.closePath();
  }

  private getCanvasPoint(evt: PointerEvent) {
    const el = this.canvas.nativeElement;
    const rect = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (evt.clientX - rect.left) * dpr,
      y: (evt.clientY - rect.top) * dpr,
    };
  }
}
