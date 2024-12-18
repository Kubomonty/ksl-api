export interface MatchDetailsDto {
  id: string;
  guestTeam: string;
  guestCaptain: string;
  homeTeam: string;
  homeCaptain: string;
  matchLocation: string;
  matchDate: Date;
  createdAt: Date;
  status: string;
  quarters: {
    q1: {
      guest: {
        pos1: string;
        pos2: string;
        pos3: string;
        pos4: string;
        pos5: string;
        pos6: string;
        pos7: string;
        pos8: string;
        legs: {
          m1: number;
          m2: number;
          m3: number;
          m4: number;
        };
        score: number;
      };
      home: {
        pos1: string;
        pos2: string;
        pos3: string;
        pos4: string;
        pos5: string;
        pos6: string;
        pos7: string;
        pos8: string;
        legs: {
          m1: number;
          m2: number;
          m3: number;
          m4: number;
        };
        score: number;
      };
    };
    q2: {
      guest: {
        pos1: string;
        pos2: string;
        pos3: string;
        pos4: string;
        pos5: string;
        pos6: string;
        pos7: string;
        pos8: string;
        legs: {
          m1: number;
          m2: number;
          m3: number;
          m4: number;
        };
        score: number;
      };
      home: {
        pos1: string;
        pos2: string;
        pos3: string;
        pos4: string;
        pos5: string;
        pos6: string;
        pos7: string;
        pos8: string;
        legs: {
          m1: number;
          m2: number;
          m3: number;
          m4: number;
        };
        score: number;
      };
    };
    q3: {
      guest: {
        pos1: string;
        pos2: string;
        pos3: string;
        pos4: string;
        pos5: string;
        pos6: string;
        pos7: string;
        pos8: string;
        legs: {
          m1: number;
          m2: number;
          m3: number;
          m4: number;
        };
        score: number;
      };
      home: {
        pos1: string;
        pos2: string;
        pos3: string;
        pos4: string;
        pos5: string;
        pos6: string;
        pos7: string;
        pos8: string;
        legs: {
          m1: number;
          m2: number;
          m3: number;
          m4: number;
        };
        score: number;
      };
    };
    q4: {
      guest: {
        pos1: string;
        pos2: string;
        pos3: string;
        pos4: string;
        pos5: string;
        pos6: string;
        pos7: string;
        pos8: string;
        legs: {
          m1: number;
          m2: number;
          m3: number;
          m4: number;
        };
        score: number;
      };
      home: {
        pos1: string;
        pos2: string;
        pos3: string;
        pos4: string;
        pos5: string;
        pos6: string;
        pos7: string;
        pos8: string;
        legs: {
          m1: number;
          m2: number;
          m3: number;
          m4: number;
        };
        score: number;
      };
    };
  };
  overtime?: {
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
}