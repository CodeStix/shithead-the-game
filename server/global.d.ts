import { Express, Request } from "express";

declare module "express-session" {
    interface SessionData {
        playerName: string;
    }
}
