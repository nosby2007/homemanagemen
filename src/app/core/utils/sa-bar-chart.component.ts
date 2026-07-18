import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiSeriesPoint } from 'src/app/features/super-admin/super-admin-metrics.service';


@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'sa-bar-chart',
  template: `
  <div class="chart-card">
    <div class="chart-head">
      <div class="chart-title">{{ title }}</div>
      <div class="chart-sub">{{ subtitle }}</div>
    </div>

    <div class="bars" *ngIf="data?.length; else empty">
      <div class="bar" *ngFor="let p of data">
        <div class="bar-col">
          <div class="bar-fill" [style.height.%]="heightPct(p.value)"></div>
        </div>
        <div class="bar-lbl">{{ p.label }}</div>
        <div class="bar-val">{{ p.value }}</div>
      </div>
    </div>

    <ng-template #empty>
      <div class="empty">No data</div>
    </ng-template>
  `,
  styles: [`
    .chart-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px}
    .chart-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:10px}
    .chart-title{font-weight:800}
    .chart-sub{opacity:.7;font-size:12px}
    .bars{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;align-items:end}
    .bar{display:flex;flex-direction:column;align-items:center;gap:6px}
    .bar-col{width:100%;height:120px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);display:flex;align-items:flex-end;overflow:hidden}
    .bar-fill{width:100%;background:rgba(99,102,241,.55)}
    .bar-lbl{font-size:12px;opacity:.8}
    .bar-val{font-size:12px;font-weight:700}
    .empty{padding:18px;opacity:.7}
  `]
})
export class SaBarChartComponent {
  @Input() title = 'Chart';
  @Input() subtitle = '';
  @Input() data: KpiSeriesPoint[] = [];

  heightPct(v: number): number {
    const max = Math.max(1, ...this.data.map(x => x.value));
    return Math.round((v / max) * 100);
  }
}
