import { NextRequest } from "next/server";
import * as XLSX from "@e965/xlsx";
import { jsPDF } from "jspdf";
import { requireStaff } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/server";
import { reportData } from "@/lib/reports";
import { localDate, money } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams; const truck = p.get("truck") ?? "global";
    if (!["global", "beverage", "food"].includes(truck)) throw new HttpError(400, "Invalid truck.");
    await requireStaff(truck, "reports"); const report = await reportData(truck, p.get("from") ?? localDate(), p.get("to") ?? localDate()); const format = p.get("format");
    if (!format) return Response.json(report);
    const filename = `street-taste-${truck}-${report.from}-${report.to}`;
    const summary = [{ Metric: "Order revenue (BHD)", Value: Number(money(report.revenue)) }, { Metric: "Orders", Value: report.orderCount }, { Metric: "Average order (BHD)", Value: Number(money(report.averageOrder)) }, { Metric: "Subscription order revenue (BHD)", Value: Number(money(report.subscriptionRevenue)) }];
    if (format === "xlsx") {
      const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(summary), "Summary");
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(report.orders.map(o => ({ Order: o.number, Truck: o.truck, Customer: o.customerName, Type: o.type, Status: o.status, Date: o.createdAt.toISOString(), Scheduled: o.scheduledAt.toISOString(), "Subtotal BHD": Number(money(o.subtotal)), "Discount BHD": Number(money(o.discount)), "Delivery BHD": Number(money(o.deliveryFee)), "Total BHD": Number(money(o.total)) }))), "Orders");
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(report.performance.map(i => ({ Item: i.name, Quantity: i.quantity, "Gross item sales BHD": Number(money(i.revenue)) }))), "Item performance");
      const bytes = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
      return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"`, "Cache-Control": "no-store" } });
    }
    if (format !== "pdf") throw new HttpError(400, "Choose PDF or Excel.");
    const doc = new jsPDF(); let y = 22;
    const line = (text: string, size = 10) => { if (y > 275) { doc.addPage(); y = 22; } doc.setFontSize(size); doc.text(text, 18, y); y += size > 14 ? 12 : 7; };
    line("STREET TASTE TRUCK", 22); line(`${truck.toUpperCase()} FINANCIAL & ORDER REPORT`, 12); line(`${report.from} to ${report.to}`); y += 6;
    for (const metric of summary) line(`${metric.Metric}: ${metric.Value}`);
    y += 8; line("ITEM PERFORMANCE (BEFORE DISCOUNTS)", 14); for (const item of report.performance) line(`${item.name} | ${item.quantity} sold | BHD ${money(item.revenue)}`);
    y += 8; line("ORDERS", 14); for (const order of report.orders) line(`#${order.number} | ${order.truck} | ${order.type} | ${order.status} | BHD ${money(order.total)}`);
    line("Revenue represents placed orders; payment is collected on delivery or pickup.", 9);
    return new Response(doc.output("arraybuffer"), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"`, "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
