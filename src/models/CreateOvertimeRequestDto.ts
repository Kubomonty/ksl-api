import { UpdateOvertimeRequestDto } from "./UpdateOvertimeRequestDto";

export interface CreateOvertimeRequestDto extends UpdateOvertimeRequestDto {
  createdAt: Date;
};
