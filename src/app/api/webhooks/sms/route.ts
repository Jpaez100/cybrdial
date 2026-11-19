import { POST as receiveIncomingSms } from "./incoming/route";

export const runtime = "nodejs";
export const POST = receiveIncomingSms;
