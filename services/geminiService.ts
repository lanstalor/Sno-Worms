import { GoogleGenAI, Type } from "@google/genai";
import { GameBoardState, CellStatus, Coordinate } from "../types";
import { AI_PERSONA, BOARD_SIZE } from "../constants";

const getClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found. AI will be dumb.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getAIMove = async (
  aiBoard: GameBoardState, 
  humanBoardRealState: GameBoardState 
): Promise<{ coordinate: Coordinate; message: string }> => {
  
  const client = getClient();
  
  const randomFallback = () => {
    let row, col;
    do {
      row = Math.floor(Math.random() * BOARD_SIZE);
      col = Math.floor(Math.random() * BOARD_SIZE);
    } while (isAlreadyFired(humanBoardRealState, row, col));
    return { coordinate: { row, col }, message: "Checking snowbanks..." };
  };

  if (!client) return randomFallback();

  try {
    const gridRepresentation = humanBoardRealState.grid.map(row => 
      row.map(cell => {
        if (cell === CellStatus.HIT) return 'X'; 
        if (cell === CellStatus.MISS) return 'O'; 
        return '.'; 
      }).join('')
    ).join('\n');

    const prompt = `
      ${AI_PERSONA}
      Current Battlefield (X=Hit, O=Miss, .=Unknown):
      ${gridRepresentation}
      
      Task: Choose a target coordinate (row 0-9, col 0-9) that has NOT been hit yet (marked as .).
      Strategy: Hunt down the enemy worms. If you found a hit (X), check adjacent squares.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            row: { type: Type.INTEGER },
            col: { type: Type.INTEGER },
            comment: { type: Type.STRING },
          },
          required: ["row", "col", "comment"],
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      if (
        typeof data.row === 'number' && 
        typeof data.col === 'number' &&
        !isAlreadyFired(humanBoardRealState, data.row, data.col)
      ) {
        return {
          coordinate: { row: data.row, col: data.col },
          message: data.comment || "Snowball incoming!"
        };
      }
    }
    
    return randomFallback();

  } catch (error) {
    console.error("Gemini API Error:", error);
    return randomFallback();
  }
};

const isAlreadyFired = (board: GameBoardState, r: number, c: number) => {
  return board.grid[r][c] === CellStatus.HIT || board.grid[r][c] === CellStatus.MISS;
};
