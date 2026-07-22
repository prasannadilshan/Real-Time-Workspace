import axios from "axios";
import env from "../config/env.js";

const API_BASE_URL =
  env.API_BASE_URL ?? `http://localhost:${env.API_PORT ?? "4000"}`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  validateStatus: () => true,
});
