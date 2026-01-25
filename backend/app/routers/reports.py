from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse, FileResponse
from app.database import get_database
from app.routers.expenses import get_current_user
from datetime import datetime
import io
import csv
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.legends import Legend
from typing import List, Dict
import os
import collections

router = APIRouter(prefix="/reports", tags=["reports"])
db = get_database()

@router.get("/csv")
async def get_csv_report(
    month: int = Query(...), 
    year: int = Query(...), 
    current_user: dict = Depends(get_current_user)
):
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    cursor = db.expenses.find({
        "user_id": current_user["id"],
        "date": {"$gte": start_date, "$lt": end_date}
    }).sort("date", 1)
    
    expenses = await cursor.to_list(length=None)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Vendor", "Category", "Amount", "Description", "Payment Mode", "Source"])
    
    for exp in expenses:
        writer.writerow([
            exp["date"].strftime("%Y-%m-%d"),
            exp.get("vendor", "N/A"),
            exp["category"],
            exp["amount"],
            exp.get("description", ""),
            exp.get("payment_mode", "upi"),
            exp.get("source", "manual")
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=expenses_{year}_{month}.csv"}
    )

@router.get("/pdf")
async def get_pdf_report(
    month: int = Query(...), 
    year: int = Query(...), 
    current_user: dict = Depends(get_current_user)
):
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    cursor = db.expenses.find({
        "user_id": current_user["id"],
        "date": {"$gte": start_date, "$lt": end_date}
    }).sort("date", 1)
    
    expenses = await cursor.to_list(length=None)
    
    # Financial Insights
    category_totals = collections.defaultdict(float)
    for e in expenses:
        category_totals[e["category"]] += e["amount"]
    
    total_spent = sum(category_totals.values())
    top_category = max(category_totals.items(), key=lambda x: x[1])[0] if category_totals else "N/A"
    avg_daily = total_spent / 30 # Simplified
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    elements = []
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading1'], fontSize=28, textColor=colors.HexColor("#00D1FF"),
        alignment=0, spaceAfter=2
    )
    metric_label_style = ParagraphStyle('MetricLabel', parent=styles['Normal'], fontSize=9, textColor=colors.grey, textTransform='uppercase', letterSpacing=1)
    metric_value_style = ParagraphStyle('MetricValue', parent=styles['Normal'], fontSize=16, textColor=colors.black, fontWeight='bold')
    section_header_style = ParagraphStyle('SectionHeader', parent=styles['Heading2'], fontSize=14, textColor=colors.black, spaceBefore=20, spaceAfter=10)

    # Header Row (Title + Mascot)
    mascot_path = "/Users/suryansh/.gemini/antigravity/brain/1b3d340c-5a26-436f-8b09-760521de636a/report_mascot_owl_monthly_statement_inr_1769350970462.png"
    
    header_data = [
        [
            [
                Paragraph("MONTHLY", ParagraphStyle('SubTitle', parent=styles['Normal'], fontSize=12, textColor=colors.grey, letterSpacing=4)),
                Paragraph("STATEMENT", title_style),
                Paragraph(f"{datetime(year, month, 1).strftime('%B %Y')}", ParagraphStyle('MonthStyle', parent=styles['Normal'], fontSize=10, textColor=colors.grey)),
            ],
            Image(mascot_path, width=100, height=100) if os.path.exists(mascot_path) else ""
        ]
    ]
    header_table = Table(header_data, colWidths=[350, 150])
    header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'CENTER'), ('ALIGN', (1,0), (1,0), 'RIGHT')]))
    elements.append(header_table)
    elements.append(Spacer(1, 40))

    # Metrics Row
    metrics_data = [
        [Paragraph("TOTAL SPENT", metric_label_style), Paragraph("TOP CATEGORY", metric_label_style), Paragraph("DAILY AVG", metric_label_style)],
        [Paragraph(f"₹{total_spent:,.0f}", metric_value_style), Paragraph(top_category, metric_value_style), Paragraph(f"₹{avg_daily:,.0f}", metric_value_style)]
    ]
    metrics_table = Table(metrics_data, colWidths=[166, 166, 166])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.whitesmoke),
        ('ROUNDEDCORNERS', [10, 10, 10, 10]),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
    ]))
    elements.append(metrics_table)
    elements.append(Spacer(1, 40))

    # Spending Chart Section
    elements.append(Paragraph("Category Breakdown", section_header_style))
    
    drawing = Drawing(400, 200)
    pc = Pie()
    pc.x = 150
    pc.y = 50
    pc.width = 150
    pc.height = 150
    pc.data = list(category_totals.values())
    pc.labels = list(category_totals.keys())
    
    # Custom vibrant colors for the pie
    chart_colors = [colors.HexColor("#00D1FF"), colors.HexColor("#FF4444"), colors.HexColor("#FFD700"), colors.HexColor("#BB86FC"), colors.HexColor("#03DAC6")]
    for i, color in enumerate(chart_colors):
        if i < len(pc.data):
            pc.slices[i].fillColor = color
            pc.slices[i].strokeColor = colors.white
            pc.slices[i].strokeWidth = 0.5

    drawing.add(pc)
    
    # Legend
    lp = Legend()
    lp.x = 320
    lp.y = 150
    lp.fontSize = 8
    lp.fontName = 'Helvetica'
    lp.alignment = 'right'
    lp.colorNamePairs = [(chart_colors[i % len(chart_colors)], k) for i, k in enumerate(category_totals.keys())]
    drawing.add(lp)
    
    elements.append(drawing)
    elements.append(Spacer(1, 20))

    # Detailed Transactions Table
    elements.append(Paragraph("Detailed Transactions", section_header_style))
    data = [["DATE", "VENDOR", "CATEGORY", "AMOUNT"]]
    for exp in expenses:
        data.append([
            exp["date"].strftime("%d %b"),
            exp.get("vendor", "N/A")[:20].upper(),
            exp["category"].upper(),
            f"₹{exp['amount']:,.2f}"
        ])
    
    table = Table(data, colWidths=[80, 160, 150, 110])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0A0A0A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.1, colors.lightgrey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.whitesmoke])
    ]))
    
    elements.append(table)
    
    # Footer
    elements.append(Spacer(1, 50))
    elements.append(Paragraph("This report exists to help you build better financial habits.", ParagraphStyle('FooterQuote', italic=True, fontSize=9, textColor=colors.grey, alignment=1)))
    elements.append(Paragraph(f"Generated on {datetime.now().strftime('%d %b %Y %H:%M')}", ParagraphStyle('Timestamp', fontSize=7, textColor=colors.lightgrey, alignment=1)))
    
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=statement_{year}_{month}.pdf"}
    )
