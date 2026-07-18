import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-signature-pad',
  imports: [CommonModule],
  template: `
    <div class="sigCard">
      <div class="h3">{{ title }}</div>
      <div class="muted" *ngIf="hint">{{ hint }}</div>

      <canvas #canvas class="canvas"
              (mousedown)="start($event)" (mousemove)="move($event)" (mouseup)="end()" (mouseleave)="end()"
              (touchstart)="start($event)" (touchmove)="move($event)" (touchend)="end()"></canvas>

      <div class="actions">
        <button class="btn secondary" type="button" (click)="clear()">Clear</button>
        <button class="btn" type="button" (click)="save()">Save</button>
      </div>
    </div>
  `,
  styles: [`
    .sigCard{ margin-top:12px; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); }
    .h3{ font-size:13px; font-weight:900; color:#e5e7eb; }
    .muted{ color: rgba(226,232,240,.75); font-size:12px; margin-top:4px; }
    .canvas{ width:100%; height:140px; margin-top:10px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background: rgba(2,6,23,.25); touch-action:none; }
    .actions{ display:flex; gap:10px; margin-top:10px; }
    .btn{ padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background: rgba(59,130,246,.85); color:white; font-weight:800; cursor:pointer; }
    .btn.secondary{ background: rgba(148,163,184,.20); }
  `]
})
export class SignaturePadComponent {
  @Input() title = 'Signature';
  @Input() hint = '';
  @Output() saved = new EventEmitter<File>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private drawing = false;

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    // set internal resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(600, Math.floor(rect.width * 2));
    canvas.height = Math.max(280, Math.floor(rect.height * 2));
    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#e5e7eb';
  }

  private pos(evt: any) {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.touches?.[0]?.clientX ?? evt.clientX;
    const clientY = evt.touches?.[0]?.clientY ?? evt.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  }

  start(evt: any) {
    evt.preventDefault?.();
    const { x, y } = this.pos(evt);
    this.drawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  move(evt: any) {
    if (!this.drawing) return;
    evt.preventDefault?.();
    const { x, y } = this.pos(evt);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  end() {
    this.drawing = false;
  }

  clear() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async save() {
    const canvas = this.canvasRef.nativeElement;
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const file = new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' });
    this.saved.emit(file);
  }
}
