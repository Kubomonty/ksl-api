import { MatchStatus } from "../enums";
import { CreateMatchRequestBody } from "./CreateMatchRequestBody";

export interface Match extends CreateMatchRequestBody {
  id: string;
  status: MatchStatus;
  statusChangedAt: Date;
  statusChangedBy: string;
};