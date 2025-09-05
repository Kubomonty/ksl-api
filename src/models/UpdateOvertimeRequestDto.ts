export interface UpdateOvertimeRequestDto {
  matchId: string;
  guest: {
    pos1?: string | null;
    pos2?: string | null;
    pos3?: string | null;
    pos4?: string | null;
    pos5?: string | null;
    pos6?: string | null;
    legs: {
      m1: number;
      m2: number;
      m3: number;
    };
    score: number;
  };
  home: {
    pos1?: string | null;
    pos2?: string | null;
    pos3?: string | null;
    pos4?: string | null;
    pos5?: string | null;
    pos6?: string | null;
    legs: {
      m1: number;
      m2: number;
      m3: number;
    };
    score: number;
  };
};
