import { NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * GET /api/pvp/lan-info — IPs LAN del servidor + puerto, para que el anfitrión
 * comparta la URL por hotspot/WiFi (p.ej. http://192.168.43.1:3000).
 */
export async function GET() {
  const ips: string[] = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      // IPv4 privadas no internas (loopback excluido)
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  const port = Number(process.env.PORT || 3000);
  return NextResponse.json({ ips, port });
}
