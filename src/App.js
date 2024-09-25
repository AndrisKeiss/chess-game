import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Chessboard from './components/Chessboard';

function App() {
  const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];

  const [board, setBoard] = useState(initialBoard);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [gameStatus, setGameStatus] = useState('ongoing');
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [lastMovedPawn, setLastMovedPawn] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [promotionPending, setPromotionPending] = useState(false);
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [kingMoved, setKingMoved] = useState({ white: false, black: false });
  const [rooksMoved, setRooksMoved] = useState({
    white: { left: false, right: false },
    black: { left: false, right: false }
  });
  const [history, setHistory] = useState([initialBoard]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [gameMode, setGameMode] = useState('human'); // 'human' or 'ai'
  const [aiThinking, setAiThinking] = useState(false);
  const [isPlayingAI, setIsPlayingAI] = useState(false);

  const getPieceSymbol = (piece) => {
    const symbols = {
      'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
      'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
    };
    return symbols[piece] || '';
  };

  const isWhitePiece = (piece) => piece && piece.toUpperCase() === piece;

  const isValidMove = (from, to, piece) => {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    // Check if the destination square is occupied by a piece of the same color
    const destinationPiece = board[toRow][toCol];
    if (destinationPiece && isWhitePiece(destinationPiece) === isWhitePiece(piece)) {
      return false;
    }

    // Basic move validation
    let isBasicValid = false;

    switch (piece.toLowerCase()) {
      case 'p': // Pawn
        const direction = isWhitePiece(piece) ? -1 : 1;
        if (fromCol === toCol && board[toRow][toCol] === null) {
          if (rowDiff === 1 && fromRow + direction === toRow) isBasicValid = true;
          if (rowDiff === 2 && fromRow + 2 * direction === toRow && 
              (fromRow === 1 || fromRow === 6) && board[fromRow + direction][fromCol] === null) isBasicValid = true;
        }
        if (rowDiff === 1 && colDiff === 1 && fromRow + direction === toRow) {
          if (board[toRow][toCol] !== null) isBasicValid = true;
          // En passant
          if (lastMovedPawn && 
              lastMovedPawn[0] === fromRow && 
              lastMovedPawn[1] === toCol && 
              board[lastMovedPawn[0]][lastMovedPawn[1]] === (isWhitePiece(piece) ? 'p' : 'P')) {
            isBasicValid = true;
          }
        }
        break;
      case 'r': // Rook
        isBasicValid = (fromRow === toRow || fromCol === toCol) && isClearPath(from, to, board);
        break;
      case 'n': // Knight
        isBasicValid = (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
        break;
      case 'b': // Bishop
        isBasicValid = rowDiff === colDiff && isClearPath(from, to, board);
        break;
      case 'q': // Queen
        isBasicValid = ((fromRow === toRow || fromCol === toCol) || (rowDiff === colDiff)) && isClearPath(from, to, board);
        break;
      case 'k': // King
        isBasicValid = rowDiff <= 1 && colDiff <= 1;
        break;
    }

    console.log(`Move from ${from} to ${to} for piece ${piece}: Basic validity = ${isBasicValid}`);

    if (!isBasicValid) return false;

    // Check if the move doesn't put or leave the king in check
    const newBoard = board.map(row => [...row]);
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;

    const playerColor = isWhitePiece(piece) ? 'white' : 'black';
    const kingInCheck = isKingInCheck(newBoard, playerColor);
    console.log(`King in check after move: ${kingInCheck}`);

    return !kingInCheck;
  };

  const isClearPath = (from, to, board) => {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const rowStep = fromRow < toRow ? 1 : fromRow > toRow ? -1 : 0;
    const colStep = fromCol < toCol ? 1 : fromCol > toCol ? -1 : 0;

    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while (currentRow !== toRow || currentCol !== toCol) {
      if (board[currentRow][currentCol] !== null) {
        return false;
      }
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  };

  const findKing = (board, player) => {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (board[i][j] === (player === 'white' ? 'K' : 'k')) {
          return [i, j];
        }
      }
    }
    return null; // Return null if king is not found
  };

  const isKingInCheck = (board, player) => {
    const kingPosition = findKing(board, player);
    if (!kingPosition) {
      console.log(`King not found for ${player}`);
      return false;
    }

    console.log(`Checking if ${player}'s king at ${kingPosition} is in check`);

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && isWhitePiece(piece) !== (player === 'white')) {
          if (isValidMoveWithoutCheckCheck([i, j], kingPosition, piece, board)) {
            console.log(`King is in check by piece at ${[i, j]}`);
            return true;
          }
        }
      }
    }
    console.log(`King is not in check`);
    return false;
  };

  // New function to check move validity without causing infinite recursion
  const isValidMoveWithoutCheckCheck = (from, to, piece, board) => {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    // Basic move validation (copy from isValidMove, but without the check for putting king in check)
    switch (piece.toLowerCase()) {
      case 'p': // Pawn
        const direction = isWhitePiece(piece) ? -1 : 1;
        if (fromCol === toCol && board[toRow][toCol] === null) {
          if (rowDiff === 1 && fromRow + direction === toRow) return true;
          if (rowDiff === 2 && fromRow + 2 * direction === toRow && 
              (fromRow === 1 || fromRow === 6) && board[fromRow + direction][fromCol] === null) return true;
        }
        if (rowDiff === 1 && colDiff === 1 && fromRow + direction === toRow && board[toRow][toCol] !== null) return true;
        return false;
      case 'r': // Rook
        return (fromRow === toRow || fromCol === toCol) && isClearPath(from, to, board);
      case 'n': // Knight
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
      case 'b': // Bishop
        return rowDiff === colDiff && isClearPath(from, to, board);
      case 'q': // Queen
        return ((fromRow === toRow || fromCol === toCol) || (rowDiff === colDiff)) && isClearPath(from, to, board);
      case 'k': // King
        return rowDiff <= 1 && colDiff <= 1;
      default:
        return false;
    }
  };

  const isCheckmate = (board, player) => {
    if (!isKingInCheck(board, player)) {
      return false;
    }

    // Check all possible moves for the current player
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && isWhitePiece(piece) === (player === 'white')) {
          for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
              if (isValidMove([i, j], [x, y], piece)) {
                const newBoard = board.map(row => [...row]);
                newBoard[x][y] = piece;
                newBoard[i][j] = null;
                if (!isKingInCheck(newBoard, player)) {
                  return false; // Found a valid move that gets out of check
                }
              }
            }
          }
        }
      }
    }
    return true; // No valid moves found to get out of check
  };

  const isStalemate = (board, player) => {
    if (isKingInCheck(board, player)) {
      return false;
    }

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && isWhitePiece(piece) === (player === 'white')) {
          for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
              if (isValidMove([i, j], [x, y], piece)) {
                return false; // Found a valid move, not a stalemate
              }
            }
          }
        }
      }
    }
    return true; // No valid moves found, it's a stalemate
  };

  const updateGameStatus = () => {
    try {
      if (isCheckmate(board, currentPlayer)) {
        setGameStatus(`Checkmate! ${currentPlayer === 'white' ? 'Black' : 'White'} wins!`);
        setAiThinking(false); // Add this line to ensure AI stops thinking on checkmate
      } else if (isStalemate(board, currentPlayer)) {
        setGameStatus('Stalemate! The game is a draw.');
        setAiThinking(false); // Add this line to ensure AI stops thinking on stalemate
      } else if (isKingInCheck(board, currentPlayer)) {
        setGameStatus(`${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} is in check!`);
      } else {
        setGameStatus('ongoing');
      }
    } catch (error) {
      console.error("Error updating game status:", error);
      setGameStatus('Error occurred');
      setAiThinking(false); // Add this line to ensure AI stops thinking on error
    }
  };

  useEffect(() => {
    updateGameStatus();
    if (gameMode === 'ai' && currentPlayer === 'black' && !promotionPending && !aiThinking && gameStatus === 'ongoing') {
      makeAiMove();
    }
  }, [gameMode, currentPlayer, promotionPending, aiThinking, gameStatus, board]);

  const calculatePossibleMoves = (piece, row, col) => {
    const moves = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (isValidMove([row, col], [i, j], piece)) {
          moves.push([i, j]);
        }
      }
    }

    // Add castling moves for the king
    if (piece.toLowerCase() === 'k') {
      const isWhite = isWhitePiece(piece);
      const backRank = isWhite ? 7 : 0;

      // Kingside castling
      if (canCastle([row, col], [backRank, 6])) {
        moves.push([backRank, 6]);
      }

      // Queenside castling
      if (canCastle([row, col], [backRank, 2])) {
        moves.push([backRank, 2]);
      }
    }

    return moves;
  };

  const handlePromotionChoice = (promotedPiece) => {
    const newBoard = [...board];
    const isWhite = isWhitePiece(promotionSquare.piece);
    newBoard[promotionSquare.row][promotionSquare.col] = isWhite
      ? promotedPiece.toUpperCase()
      : promotedPiece.toLowerCase();

    setBoard(newBoard);
    setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
    setPromotionPending(false);

    // Update move history
    const from = positionToNotation(
      promotionSquare.row + (isWhite ? 1 : -1),
      promotionSquare.col
    );
    const to = positionToNotation(promotionSquare.row, promotionSquare.col);
    const moveNotation = `${promotionSquare.piece.toUpperCase()}${from}-${to}=${promotedPiece.toUpperCase()}`;
    setMoveHistory((prevHistory) => [...prevHistory, moveNotation]);

    setPromotionSquare(null);

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBoard);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleSquareClick = (i, j) => {
    if (gameMode === 'ai' && currentPlayer === 'black') return;
    if (aiThinking) return;
    
    console.log(`Clicked square: [${i}, ${j}]`);
    if (selectedPiece) {
      const { i: fromI, j: fromJ } = selectedPiece;
      const piece = board[fromI][fromJ];
      const isValidMoveOrCastle =
        isValidMove([fromI, fromJ], [i, j], piece) ||
        (piece.toLowerCase() === 'k' && canCastle([fromI, fromJ], [i, j]));

      if (isValidMoveOrCastle) {
        console.log('Move is valid');
        const newBoard = board.map((row) => [...row]);
        const capturedPiece = newBoard[i][j];

        handleSpecialMoves(newBoard, piece, fromI, fromJ, i, j);

        if (!isKingInCheck(newBoard, currentPlayer)) {
          handleSuccessfulMove(newBoard, piece, fromI, fromJ, i, j, capturedPiece);
        } else {
          console.log('Move puts own king in check');
        }
      } else {
        console.log('Move is invalid');
      }
      setSelectedPiece(null);
      setPossibleMoves([]);
    } else if (board[i][j]) {
      handlePieceSelection(i, j);
    } else {
      setSelectedPiece(null);
      setPossibleMoves([]);
    }
  };

  const resetGame = () => {
    setBoard(initialBoard);
    setSelectedPiece(null);
    setCurrentPlayer('white');
    setGameStatus('ongoing');
    setPossibleMoves([]);
    setLastMovedPawn(null);
    setMoveHistory([]);
    setPromotionPending(false);
    setPromotionSquare(null);
    setKingMoved({ white: false, black: false });
    setRooksMoved({
      white: { left: false, right: false },
      black: { left: false, right: false }
    });
    setHistory([initialBoard]);
    setHistoryIndex(0);
    setAiThinking(false);

    // If in AI mode, prepare for AI's move if it's black's turn
    if (gameMode === 'ai') {
      setCurrentPlayer('white');
      // We don't need to make an immediate AI move here, as the useEffect will handle it
    }
  };

  const canCastle = (from, to) => {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const piece = board[fromRow][fromCol];

    if (piece.toLowerCase() !== 'k' || Math.abs(toCol - fromCol) !== 2 || fromRow !== toRow) {
      return false;
    }

    const isWhite = isWhitePiece(piece);
    const isKingSide = toCol > fromCol;

    // Check if king or rook has moved
    if (kingMoved[isWhite ? 'white' : 'black']) {
      return false;
    }

    const rookSide = isKingSide ? 'right' : 'left';
    if (rooksMoved[isWhite ? 'white' : 'black'][rookSide]) {
      return false;
    }

    // Check if the path is clear
    const direction = isKingSide ? 1 : -1;
    for (let col = fromCol + direction; col !== toCol; col += direction) {
      if (board[fromRow][col] !== null) {
        return false;
      }
    }

    // Check if the king is not in check and doesn't pass through check
    for (let col = fromCol; col !== toCol + direction; col += direction) {
      if (isKingInCheck(board.map(row => [...row]), currentPlayer)) {
        return false;
      }
    }

    return true;
  };

  const canEnPassant = (from, to) => {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const piece = board[fromRow][fromCol];

    if (piece.toLowerCase() !== 'p' || Math.abs(toCol - fromCol) !== 1 || Math.abs(toRow - fromRow) !== 1) {
      return false;
    }

    if (!lastMovedPawn || lastMovedPawn[0] !== fromRow || Math.abs(lastMovedPawn[1] - toCol) !== 1) {
      return false;
    }

    return board[toRow][toCol] === null && board[lastMovedPawn[0]][lastMovedPawn[1]] !== null;
  };

  const positionToNotation = (row, col) => {
    const files = 'abcdefgh';
    const ranks = '87654321';
    return files[col] + ranks[row];
  };

  const PromotionModal = ({ onChoice }) => (
    <div className="promotion-modal">
      <button onClick={() => onChoice('q')}>♕</button>
      <button onClick={() => onChoice('r')}>♖</button>
      <button onClick={() => onChoice('b')}>♗</button>
      <button onClick={() => onChoice('n')}>♘</button>
    </div>
  );

  const MoveHistory = ({ moves }) => (
    <div className="move-history">
      <h3>Move History</h3>
      <table>
        <tbody>
          {moves.reduce((rows, move, index) => {
            if (index % 2 === 0) {
              rows.push([move]);
            } else {
              rows[rows.length - 1].push(move);
            }
            return rows;
          }, []).map((row, index) => (
            <tr key={index}>
              <td>{index + 1}.</td>
              <td>{row[0]}</td>
              <td>{row[1] || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const undoMove = () => {
    if (historyIndex > 0) {
      const newIndex = gameMode === 'ai' ? historyIndex - 2 : historyIndex - 1;
      if (newIndex >= 0) {
        setHistoryIndex(newIndex);
        setBoard(history[newIndex]);
        setCurrentPlayer('white'); // Always set to white after undoing in AI mode
        // Update move history
        setMoveHistory(prevHistory => prevHistory.slice(0, newIndex));
      }
    }
  };

  const redoMove = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = gameMode === 'ai' ? historyIndex + 2 : historyIndex + 1;
      if (newIndex < history.length) {
        setHistoryIndex(newIndex);
        setBoard(history[newIndex]);
        setCurrentPlayer(newIndex % 2 === 0 ? 'white' : 'black');
        // Update move history
        setMoveHistory(prevHistory => history.slice(0, newIndex + 1).flatMap((_, i) => 
          i > 0 ? [getMoveNotation(history[i-1], history[i])] : []
        ));
      }
    }
  };

  const getMoveNotation = (prevBoard, currentBoard) => {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (prevBoard[i][j] !== currentBoard[i][j]) {
          if (prevBoard[i][j] !== null) {
            // Found the piece that moved
            for (let x = 0; x < 8; x++) {
              for (let y = 0; y < 8; y++) {
                if (currentBoard[x][y] === prevBoard[i][j]) {
                  // Found where the piece moved to
                  const piece = prevBoard[i][j];
                  const from = positionToNotation(i, j);
                  const to = positionToNotation(x, y);
                  return `${getPieceLetter(piece)}${from}-${to}`;
                }
              }
            }
          }
        }
      }
    }
    return '';
  };

  const handleSpecialMoves = (newBoard, piece, fromI, fromJ, toI, toJ) => {
    // Handle castling
    if (piece.toLowerCase() === 'k' && Math.abs(toJ - fromJ) === 2) {
      const rookFromCol = toJ > fromJ ? 7 : 0;
      const rookToCol = toJ > fromJ ? 5 : 3;
      newBoard[toI][rookToCol] = newBoard[toI][rookFromCol];
      newBoard[toI][rookFromCol] = null;
    }

    // Handle en passant
    if (
      piece.toLowerCase() === 'p' &&
      Math.abs(toJ - fromJ) === 1 &&
      newBoard[toI][toJ] === null &&
      lastMovedPawn &&
      lastMovedPawn[0] === fromI &&
      lastMovedPawn[1] === toJ
    ) {
      newBoard[lastMovedPawn[0]][lastMovedPawn[1]] = null; // Remove the captured pawn
    }

    // Move the piece
    newBoard[toI][toJ] = piece;
    newBoard[fromI][fromJ] = null;
  };

  const handleSuccessfulMove = (newBoard, piece, fromI, fromJ, toI, toJ, capturedPiece) => {
    if (piece.toLowerCase() === 'p' && (toI === 0 || toI === 7)) {
      handlePawnPromotion(newBoard, piece, fromI, fromJ, toI, toJ, capturedPiece);
    } else {
      updateGameState(newBoard, piece, fromI, fromJ, toI, toJ, capturedPiece);
    }
  };

  const handlePawnPromotion = (newBoard, piece, fromI, fromJ, toI, toJ, capturedPiece) => {
    setPromotionPending(true);
    setPromotionSquare({ row: toI, col: toJ, piece: piece, fromRow: fromI, fromCol: fromJ });
    setBoard(newBoard);
  };

  const updateGameState = (newBoard, piece, fromI, fromJ, toI, toJ, capturedPiece) => {
    setBoard(newBoard);
    setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
    setSelectedPiece(null);
    setPossibleMoves([]);

    updateLastMovedPawn(piece, toI, fromI, toJ);
    updateMoveHistory(piece, fromI, fromJ, toI, toJ, capturedPiece);
    updateGameHistory(newBoard);
  };

  const updateLastMovedPawn = (piece, toI, fromI, toJ) => {
    if (piece.toLowerCase() === 'p' && Math.abs(toI - fromI) === 2) {
      setLastMovedPawn([toI, toJ]);
    } else {
      setLastMovedPawn(null);
    }
  };

  const getPieceLetter = (piece) => {
    const letters = { 'k': 'K', 'q': 'Q', 'r': 'R', 'b': 'B', 'n': 'N' };
    return letters[piece.toLowerCase()] || '';
  };

  const updateMoveHistory = (piece, fromI, fromJ, toI, toJ, capturedPiece) => {
    const from = positionToNotation(fromI, fromJ);
    const to = positionToNotation(toI, toJ);
    let moveNotation = '';

    // Special notation for castling
    if (piece.toLowerCase() === 'k' && Math.abs(toJ - fromJ) === 2) {
      moveNotation = toJ > fromJ ? 'O-O' : 'O-O-O';
    } else {
      const pieceLetter = getPieceLetter(piece);
      const isCapture = capturedPiece !== null;
      const isPawnMove = piece.toLowerCase() === 'p';

      if (isPawnMove) {
        moveNotation = isCapture ? `${from[0]}x${to}` : to;
      } else {
        moveNotation = `${pieceLetter}${isCapture ? 'x' : ''}${to}`;
      }

      // Check for promotion
      if (isPawnMove && (toI === 0 || toI === 7)) {
        moveNotation += `=${getPieceLetter('q')}`; // Assume queen promotion for simplicity
      }
    }

    // Add check or checkmate symbol
    const newBoard = board.map(row => [...row]);
    newBoard[toI][toJ] = piece;
    newBoard[fromI][fromJ] = null;
    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    if (isCheckmate(newBoard, nextPlayer)) {
      moveNotation += '#';
    } else if (isKingInCheck(newBoard, nextPlayer)) {
      moveNotation += '+';
    }

    setMoveHistory((prevHistory) => [...prevHistory, moveNotation]);
  };

  const updateGameHistory = (newBoard) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBoard);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handlePieceSelection = (i, j) => {
    const isWhite = isWhitePiece(board[i][j]);
    if ((isWhite && currentPlayer === 'white') || (!isWhite && currentPlayer === 'black')) {
      setSelectedPiece({ i, j });
      const moves = calculatePossibleMoves(board[i][j], i, j);
      setPossibleMoves(moves);
    }
  };

  const generateAllLegalMoves = (player) => {
    const moves = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && isWhitePiece(piece) === (player === 'white')) {
          const pieceMoves = calculatePossibleMoves(piece, i, j);
          pieceMoves.forEach(move => {
            moves.push({ from: [i, j], to: move });
          });
        }
      }
    }
    return moves;
  };

  const evaluateBoard = (board) => {
    const pieceValues = {
      'p': -1, 'n': -3, 'b': -3.5, 'r': -5, 'q': -9, 'k': -100,
      'P': 1, 'N': 3, 'B': 3.5, 'R': 5, 'Q': 9, 'K': 100
    };

    const pawnPositionValues = [
      [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
      [5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
      [1.0,  1.0,  2.0,  3.0,  3.0,  2.0,  1.0,  1.0],
      [0.5,  0.5,  1.0,  2.5,  2.5,  1.0,  0.5,  0.5],
      [0.0,  0.0,  0.0,  2.0,  2.0,  0.0,  0.0,  0.0],
      [0.5, -0.5, -1.0,  0.0,  0.0, -1.0, -0.5,  0.5],
      [0.5,  1.0,  1.0,  -2.0, -2.0,  1.0,  1.0,  0.5],
      [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
    ];

    let score = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (board[i][j]) {
          // Material value
          score += pieceValues[board[i][j]];
          
          // Position value for pawns
          if (board[i][j].toLowerCase() === 'p') {
            if (board[i][j] === 'p') {
              score -= pawnPositionValues[i][j] / 10;
            } else {
              score += pawnPositionValues[7-i][j] / 10;
            }
          }
        }
      }
    }

    // Bonus for controlling the center
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    for (let [i, j] of centerSquares) {
      if (board[i][j]) {
        score += board[i][j].toLowerCase() === board[i][j] ? -0.3 : 0.3;
      }
    }

    return score;
  };

  const orderMoves = (board, moves) => {
    return moves.sort((a, b) => {
      const pieceA = board[a.from[0]][a.from[1]];
      const pieceB = board[b.from[0]][b.from[1]];
      const captureA = board[a.to[0]][a.to[1]];
      const captureB = board[b.to[0]][b.to[1]];
      
      const scoreA = (captureA ? getPieceValue(captureA) * 10 : 0) - (pieceA && pieceA.toLowerCase() === 'p' ? 1 : 0);
      const scoreB = (captureB ? getPieceValue(captureB) * 10 : 0) - (pieceB && pieceB.toLowerCase() === 'p' ? 1 : 0);
      
      return scoreB - scoreA;
    });
  };

  const getPieceValue = (piece) => {
    const values = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
    return values[piece.toLowerCase()] || 0;
  };

  const minimax = (board, depth, alpha, beta, maximizingPlayer, timeLimit, startTime) => {
    if (depth === 0 || Date.now() - startTime > timeLimit) {
      return evaluateBoard(board);
    }

    const moves = orderMoves(board, generateAllLegalMoves(maximizingPlayer ? 'white' : 'black'));

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (let move of moves) {
        const newBoard = makeMove(board, move);
        const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, timeLimit, startTime);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let move of moves) {
        const newBoard = makeMove(board, move);
        const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, timeLimit, startTime);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  };

  const makeMove = (board, move) => {
    const newBoard = board.map(row => [...row]);
    const { from, to } = move;
    newBoard[to[0]][to[1]] = newBoard[from[0]][from[1]];
    newBoard[from[0]][from[1]] = null;
    return newBoard;
  };

  const makeAiMove = useCallback(() => {
    if (gameStatus !== 'ongoing') {
      setAiThinking(false);
      return;
    }
    setAiThinking(true);
    
    const startTime = Date.now();
    const timeLimit = 3000; // 3 seconds time limit

    setTimeout(() => {
      try {
        const legalMoves = generateAllLegalMoves('black');
        if (legalMoves.length > 0) {
          let bestMove = null;
          let bestScore = Infinity;
          
          for (let depth = 1; depth <= 5; depth++) {
            if (Date.now() - startTime > timeLimit) break;
            
            for (let move of orderMoves(board, legalMoves)) {
              if (Date.now() - startTime > timeLimit) break;
              
              const newBoard = makeMove(board, move);
              const score = minimax(newBoard, depth, -Infinity, Infinity, true, timeLimit, startTime);
              
              if (score < bestScore || bestMove === null) {
                bestScore = score;
                bestMove = move;
              }
            }
          }

          if (bestMove) {
            const { from, to } = bestMove;
            const piece = board[from[0]][from[1]];
            const newBoard = makeMove(board, bestMove);
            setBoard(newBoard);
            setCurrentPlayer('white');
            updateMoveHistory(piece, from[0], from[1], to[0], to[1], board[to[0]][to[1]]);
            updateGameHistory(newBoard);
          }
        }
      } catch (error) {
        console.error("Error in AI move generation:", error);
      } finally {
        setAiThinking(false);
      }
    }, 0);
  }, [board, gameStatus, setBoard, setCurrentPlayer, updateMoveHistory, updateGameHistory]);

  const toggleGameMode = () => {
    const newMode = gameMode === 'human' ? 'ai' : 'human';
    setIsPlayingAI(newMode === 'ai');
    if (newMode === 'ai') {
      setAiThinking(true);
      setTimeout(() => {
        setGameMode(newMode);
        resetGame();
        if (currentPlayer === 'black') {
          const legalMoves = generateAllLegalMoves('black');
          if (legalMoves.length > 0) {
            const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            const { from, to } = randomMove;
            const piece = initialBoard[from[0]][from[1]];
            const newBoard = initialBoard.map(row => [...row]);
            newBoard[to[0]][to[1]] = piece;
            newBoard[from[0]][from[1]] = null;
            setBoard(newBoard);
            updateMoveHistory(piece, from[0], from[1], to[0], to[1], initialBoard[to[0]][to[1]]);
            updateGameHistory(newBoard);
          }
        }
        setAiThinking(false);
      }, 100);
    } else {
      setGameMode(newMode);
      resetGame();
    }
  };

  return (
    <div className={`App ${isPlayingAI ? 'evil-dmitry-mode' : ''}`}>
      <div className="game-layout">
        <div className="sidebar left-sidebar">
          <div className="game-controls">
            <button className="game-button reset-button" onClick={resetGame}>Reset Game</button>
            <button 
              className="game-button undo-button" 
              onClick={undoMove} 
              disabled={historyIndex <= (gameMode === 'ai' ? 1 : 0)}
            >
              Undo
            </button>
            <button 
              className="game-button redo-button" 
              onClick={redoMove} 
              disabled={historyIndex >= (gameMode === 'ai' ? history.length - 2 : history.length - 1)}
            >
              Redo
            </button>
            <button className="game-button mode-button" onClick={toggleGameMode} disabled={aiThinking}>
              {gameMode === 'human' ? 'Play vs AI' : 'Play vs Human'}
            </button>
          </div>
          {gameMode === 'ai' && (
            <div className="ai-opponent">
              <img src="/evil-dmitry.png" alt="Evil Dmitry" className="ai-avatar" />
              <p className="ai-name">Evil Dmitry</p>
            </div>
          )}
        </div>
        <div className="game-container">
          <div className="game-info">
            Current player: {currentPlayer}
          </div>
          <div className="game-status">
            {gameStatus !== 'ongoing' && <p>{gameStatus}</p>}
          </div>
          <div className="chessboard-container">
            <Chessboard
              board={board}
              selectedPiece={selectedPiece}
              possibleMoves={possibleMoves}
              handleSquareClick={handleSquareClick}
              getPieceSymbol={getPieceSymbol}
              isWhitePiece={isWhitePiece}
            />
            {aiThinking && <div className="ai-thinking-overlay">AI is thinking...</div>}
          </div>
          {promotionPending && (
            <PromotionModal onChoice={handlePromotionChoice} />
          )}
        </div>
        <div className="sidebar right-sidebar">
          <MoveHistory moves={moveHistory} />
        </div>
      </div>
    </div>
  );
}

export default App;
