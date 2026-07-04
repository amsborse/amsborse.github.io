export interface StepFormula {
  prevSum: number;
  outgoing: number | null;
  incoming: number;
  newSum: number;
}

export interface ExecutionStep {
  left: number;
  right: number;
  currentSum: number;
  maxSum: number;
  elementsInWindow: number[];
  incomingIdx: number;
  outgoingIdx: number;
  isNewMax: boolean;
  logs: string[];
  formula: StepFormula;
}

export function generateSlidingWindowSteps(array: number[], K: number): ExecutionStep[] {
  const list: ExecutionStep[] = [];
  let left = 0;
  let currentSum = 0;
  let maxSum = 0;

  for (let right = 0; right < array.length; right++) {
    currentSum += array[right];

    if (right < K - 1) {
      list.push({
        left,
        right,
        currentSum,
        maxSum,
        elementsInWindow: Array.from({ length: right + 1 }, (_, i) => i),
        incomingIdx: right,
        outgoingIdx: -1,
        isNewMax: false,
        logs: [
          `LOAD arr[${right}] = ${array[right]}`,
          `SUM is now ${currentSum}`,
          `WAIT filling window (${right + 1}/${K})`,
        ],
        formula: {
          prevSum: currentSum - array[right],
          outgoing: null,
          incoming: array[right],
          newSum: currentSum,
        },
      });
      continue;
    }

    if (right === K - 1) {
      maxSum = currentSum;
      list.push({
        left,
        right,
        currentSum,
        maxSum,
        elementsInWindow: Array.from({ length: K }, (_, i) => i),
        incomingIdx: right,
        outgoingIdx: -1,
        isNewMax: true,
        logs: [
          `LOAD arr[${right}] = ${array[right]}`,
          `WINDOW READY [K = ${K}]`,
          `SUM is ${currentSum}`,
          `MAX becomes ${maxSum}`,
        ],
        formula: {
          prevSum: currentSum - array[right],
          outgoing: null,
          incoming: array[right],
          newSum: currentSum,
        },
      });
      continue;
    }

    const outgoing = array[left];
    const outgoingIdx = left;
    const prevWindowSum = currentSum - array[right];
    left++;
    currentSum -= outgoing;

    const isNewMax = currentSum > maxSum;
    if (isNewMax) maxSum = currentSum;

    list.push({
      left,
      right,
      currentSum,
      maxSum,
      elementsInWindow: Array.from({ length: K }, (_, i) => left + i),
      incomingIdx: right,
      outgoingIdx,
      isNewMax,
      logs: [
        `OUT arr[${outgoingIdx}] = ${outgoing}`,
        `IN arr[${right}] = ${array[right]}`,
        `SUM ${prevWindowSum} - ${outgoing} + ${array[right]} = ${currentSum}`,
        isNewMax ? `NEW MAXIMUM ${maxSum}` : `MAX stays ${maxSum}`,
      ],
      formula: {
        prevSum: prevWindowSum,
        outgoing,
        incoming: array[right],
        newSum: currentSum,
      },
    });
  }

  return list;
}
