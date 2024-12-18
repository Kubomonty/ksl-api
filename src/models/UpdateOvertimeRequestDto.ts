export interface UpdateOvertimeRequestDto {
  matchId: string;
  guest: {
    pos1: string;
    pos2: string;
    pos3: string;
    pos4: string;
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
    pos1: string;
    pos2: string;
    pos3: string;
    pos4: string;
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
