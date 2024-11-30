import { MatchStatus } from "../enums";
import { CreateMatchRequestBodyDto } from "./CreateMatchRequestBodyDto";

export interface MatchDto extends CreateMatchRequestBodyDto {
  id: string;
  status: MatchStatus;
  statusChangedAt: Date;
  statusChangedBy: string;
};