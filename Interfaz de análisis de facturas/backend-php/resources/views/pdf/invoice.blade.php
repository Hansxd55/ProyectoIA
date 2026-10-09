<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        body { color: #292524; font-family: DejaVu Sans, sans-serif; font-size: 12px; }
        .header { border-bottom: 2px solid #0f766e; margin-bottom: 28px; padding-bottom: 14px; }
        h1 { color: #0f766e; font-size: 24px; margin: 0; }
        .muted { color: #78716c; }
        table { border-collapse: collapse; margin-top: 24px; width: 100%; }
        th, td { border-bottom: 1px solid #d6d3d1; padding: 10px; text-align: left; }
        th { background: #e7e5e4; }
        .total { font-size: 18px; font-weight: bold; text-align: right; }
        .analysis { background: #f5f5f4; border-left: 3px solid #0f766e; margin-top: 24px; padding: 12px; }
    </style>
</head>
<body>
    <div class="header"><h1>Nexo</h1><div class="muted">Reporte inteligente de factura</div></div>
    <h2>Factura {{ $invoice->number }}</h2>
    <p><strong>Cliente:</strong> {{ $invoice->customer_name }} · {{ $invoice->customer_tax_id ?: 'NIF no indicado' }}</p>
    <p><strong>Emisión:</strong> {{ optional($invoice->issued_at)->format('d/m/Y') ?: '—' }} · <strong>Vencimiento:</strong> {{ optional($invoice->due_at)->format('d/m/Y') ?: '—' }}</p>
    <table>
        <thead><tr><th>Concepto</th><th>Importe</th></tr></thead>
        <tbody>
            <tr><td>Base imponible</td><td>{{ number_format($invoice->subtotal, 2, ',', '.') }} {{ $invoice->currency }}</td></tr>
            <tr><td>Impuestos</td><td>{{ number_format($invoice->tax, 2, ',', '.') }} {{ $invoice->currency }}</td></tr>
            <tr><td class="total">TOTAL</td><td class="total">{{ number_format($invoice->total, 2, ',', '.') }} {{ $invoice->currency }}</td></tr>
        </tbody>
    </table>
    @foreach ($invoice->analyses as $analysis)
        <div class="analysis"><strong>Agente {{ ucfirst($analysis->agent) }} · {{ $analysis->confidence }}%</strong><br>{{ $analysis->result['message'] ?? '' }}</div>
    @endforeach
</body>
</html>
