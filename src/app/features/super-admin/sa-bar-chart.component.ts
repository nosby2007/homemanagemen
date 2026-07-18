import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type KpiSeriesPoint = { label: string; value: number };

@Component({
  standalone: true,
  selector: 'sa-bar-chart',
  imports: [CommonModule],
  template: `
    <div class="panel">
      <div class="head">
        <div>
          <div class="t">{{ title }}</div>
          <div class="s" *ngIf="subtitle">{{ subtitle }}</div>
        </div>
      </div>

      <div class="chart" *ngIf="data?.length; else empty">
        <div class="bar" *ngFor="let p of data">
          <div class="fill" [style.height.%]="pct(p.value)"></div>
          <div class="lbl">{{ p.label }}</div>
          <div class="val">{{ p.value }}</div>
        </div>
      </div>

      <ng-template #empty>
        <div class="empty">No data.</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .panel{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
    .t{font-weight:900}
    .s{opacity:.7;font-size:12px;margin-top:3px}
    .chart{display:flex;gap:10px;align-items:flex-end;height:180px;padding-top:8px}
    .bar{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px}
    .fill{width:100%;border-radius:10px;background:rgba(99,102,241,.35);border:1px solid rgba(99,102,241,.55)}
    .lbl{font-size:11px;opacity:.75}
    .val{font-size:11px;opacity:.85}
    .empty{opacity:.7;padding:10px 0}
  `]
})
export class SaBarChartComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() data: KpiSeriesPoint[] = [];

  private max(): number {
    const m = Math.max(0, ...(this.data || []).map(x => x.value || 0));
    return m <= 0 ? 1 : m;
  }

  pct(v: number): number {
    return Math.round((Math.max(0, v || 0) / this.max()) * 100);
  }
}
