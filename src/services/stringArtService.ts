import sharp from 'sharp';

interface Nail {
    x: number;
    y: number;
}

export interface StringArtOutput {
    lines: [number, number][];
    nails: Nail[];
}

export class StringArtService {
    
    private calculateLineScore(startX: number, startY: number, endX: number, endY: number, data: Buffer, info: sharp.OutputInfo): number {
        let score = 0;
        const {width,channels} = info;
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        const sx = (startX < endX) ? 1 : -1;
        const sy = (startY < endY) ? 1 : -1;    
        let err = dx - dy;

        let x = startX;
        let y = startY;

        while (true) {
            if (x >= 0 && x < width && y >= 0 && y < info.height) {
                const pixelIndex = (y * width + x) * channels;
                score += data[pixelIndex];
            }

            if (x === endX && y === endY) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }
        return score;
    }

    private updateCanvas(startX: number, startY: number, endX: number, endY: number, data: Buffer, info: sharp.OutputInfo): void {
        const { width, channels } = info;
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        const sx = (startX < endX) ? 1 : -1;
        const sy = (startY < endY) ? 1 : -1;
        let err = dx - dy;

        let x = startX;
        let y = startY;

        while (true) {
            if (x >= 0 && x < width && y >= 0 && y < info.height) {
                const pixelIndex = (y * width + x) * channels;
                data[pixelIndex] = Math.min(255, data[pixelIndex] + 50);
            }

            if (x === endX && y === endY) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }
    }

    public generate(data: Buffer, info: sharp.OutputInfo): StringArtOutput {
        const { width, height } = info;

        // 1. Generate the nail coordinates in a circle
        const numberOfNails = 240;
        const radius = Math.min(width, height) / 2 - 20;
        const centerX = width / 2;
        const centerY = height / 2;
        const nails: Nail[] = [];

        for (let i = 0; i < numberOfNails; i++) {
            const angle = (i / numberOfNails) * 2 * Math.PI;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            nails.push({ x: Math.floor(x), y: Math.floor(y) });
        }

        // 2. The Greedy Algorithm Loop
        let currentNailIndex = 0;
        let previousNailIndex = -1; // Added a new variable to track the previous nail
        const stringArtLines: [number, number][] = [];
        const numberOfLines = 4000;

        for (let i = 0; i < numberOfLines; i++) {
            let bestScore = Infinity;
            let bestNailIndex = -1;

            // Iterate through all other nails to find the best one
            for (let nextNailIndex = 0; nextNailIndex < numberOfNails; nextNailIndex++) {
                // FIX: Now we skip the current nail AND the previous nail
                if (nextNailIndex === currentNailIndex || nextNailIndex === previousNailIndex) {
                    continue;
                }

                const score = this.calculateLineScore(
                    nails[currentNailIndex].x,
                    nails[currentNailIndex].y,
                    nails[nextNailIndex].x,
                    nails[nextNailIndex].y,
                    data,
                    info
                );

                if (score < bestScore) {
                    bestScore = score;
                    bestNailIndex = nextNailIndex;
                }
            }

            if (bestNailIndex === -1) break; // Exit if no good nail is found

            // Add the best line to our result list
            stringArtLines.push([currentNailIndex, bestNailIndex]);

            // "Draw" the line on the virtual canvas
            this.updateCanvas(
                nails[currentNailIndex].x,
                nails[currentNailIndex].y,
                nails[bestNailIndex].x,
                nails[bestNailIndex].y,
                data,
                info
            );
            
            // Update the state for the next iteration
            previousNailIndex = currentNailIndex; // Store the current nail as previous
            currentNailIndex = bestNailIndex; // Move to the new best nail
        }

        return { lines: stringArtLines, nails: nails };
    }
}