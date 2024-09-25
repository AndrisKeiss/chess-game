import React from 'react';

const Chessboard = ({ board, selectedPiece, possibleMoves, handleSquareClick, getPieceSymbol, isWhitePiece }) => {
  const renderSquare = (i, j) => {
    const isBlack = (i + j) % 2 === 1;
    const piece = board[i][j];
    const isSelected = selectedPiece && selectedPiece.i === i && selectedPiece.j === j;
    const isPossibleMove = possibleMoves.some(([row, col]) => row === i && col === j);
    const pieceClass = piece ? (isWhitePiece(piece) ? 'white-piece' : 'black-piece') : '';
    return (
      <div
        key={`${i}-${j}`}
        className={`square ${isBlack ? 'black' : 'white'} ${isSelected ? 'selected' : ''} ${isPossibleMove ? 'possible-move' : ''}`}
        onClick={() => handleSquareClick(i, j)}
      >
        {piece && <div className={`piece ${pieceClass}`}>{getPieceSymbol(piece)}</div>}
      </div>
    );
  };

  const renderBoard = () => {
    const boardJSX = [];
    const files = 'abcdefgh';
    const ranks = '87654321';

    // Add file labels (a-h)
    boardJSX.push(
      <div key="file-labels" className="file-labels">
        {files.split('').map((file, index) => (
          <div key={file} className="label">{file}</div>
        ))}
      </div>
    );

    for (let i = 0; i < 8; i++) {
      // Add rank label
      boardJSX.push(
        <div key={`rank-${i}`} className="rank-label">
          <div className="label">{ranks[i]}</div>
        </div>
      );

      for (let j = 0; j < 8; j++) {
        boardJSX.push(renderSquare(i, j));
      }
    }
    return boardJSX;
  };

  return (
    <div className="chessboard">
      {renderBoard()}
    </div>
  );
};

export default Chessboard;