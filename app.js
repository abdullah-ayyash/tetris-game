document.addEventListener("DOMContentLoaded", () => {
    const grid = document.querySelector('.grid')
    let squares = Array.from(document.querySelectorAll('.grid div'))
    const scoreDisplay = document.querySelector('#score')
    const startBtn = document.querySelector('#start-btn')
    const width = 10;
    let nextRandom = 0;
    let timerId;
    let score = 0;

    const lTetromino = [
        [width, width + 1, width + 2, 2],
        [1, width + 1, width * 2 + 1, width * 2 + 2],
        [width, width + 1, width + 2, width * 2],
        [1, 2, width + 1, width * 2 + 1]
    ]
    const zTetromino = [
        [0, width, width + 1, width * 2 + 1],
        [width + 1, width + 2, width * 2, width * 2 + 1],
        [0, width, width + 1, width * 2 + 1],
        [width + 1, width + 2, width * 2, width * 2 + 1]
    ]

    const tTetromino = [
        [1, width, width + 1, width + 2],
        [1, width + 1, width + 2, width * 2 + 1],
        [width, width + 1, width + 2, width * 2 + 1],
        [1, width, width + 1, width * 2 + 1]
    ]

    const oTetromino = [
        [0, 1, width, width + 1],
        [0, 1, width, width + 1],
        [0, 1, width, width + 1],
        [0, 1, width, width + 1]
    ]

    const iTetromino = [
        [1, width + 1, width * 2 + 1, width * 3 + 1],
        [width, width + 1, width + 2, width + 3],
        [1, width + 1, width * 2 + 1, width * 3 + 1],
        [width, width + 1, width + 2, width + 3]
    ]

    const colors = [
        'Tomato',
        'MediumSeaGreen',
        'DodgerBlue',
        'SlateBlue',
        'Violet'

    ]

    const theTetrominoes = [lTetromino, zTetromino, tTetromino, oTetromino, iTetromino]
    let currentPosition = 2;
    let currentRotation = 0 // Math.floor(Math.random()*4)
    let rand = Math.floor(Math.random()*theTetrominoes.length)
    let current = theTetrominoes[rand][currentRotation]
    function draw(){
        current.forEach(position =>{
            squares[position+currentPosition].classList.add('tetromino')
            squares[position+currentPosition].style.backgroundColor = colors[rand];
        })
    }

    function undraw(){
        current.forEach(position =>{
            squares[position+currentPosition].classList.remove('tetromino')
            squares[position+currentPosition].style.backgroundColor = '';
        })
    }
    // Start Game
    // timerId = setInterval(moveDown, 1000);

    document.addEventListener('keyup', (e) =>{
        e.preventDefault();
        if(e.code === "ArrowLeft"){
            moveLeft()
        }
        else if(e.code === "ArrowRight"){
            moveRight()
        }
        else if(e.key == 'ArrowDown'){
            moveDown()
        }
        else if(e.key == 'ArrowUp'){
            rotate()
        }

    })
    
    function moveDown(){
        undraw()
        currentPosition += width;
        draw()
        freeze()
    }
    function freeze(){
        if(current.some(index =>squares[currentPosition + index + width].classList.contains('taken'))){
            current.forEach(index => squares[currentPosition + index].classList.add('taken'))
            rand = nextRandom
            nextRandom = Math.floor(Math.random()*theTetrominoes.length);
            current = theTetrominoes[rand][currentRotation];
            currentPosition = 4;
            displayShape();
            draw();
            addScore();
            gameOver();
        }
    }

    function moveLeft(){
        undraw();
        isLeftMost = current.some(position => (currentPosition + position) % width === 0);
        if(!isLeftMost){
            currentPosition -= 1;
        }

        if(current.some(position => squares[currentPosition + position].classList.contains('taken'))){
            currentPosition += 1;
        }

        draw()
    }

    function moveRight(){
        undraw();
        const isRightMost = current.some(index => {
            let checkP = String(currentPosition + index);
            return checkP[checkP.length-1] === '9'
        })
        
        if(!isRightMost){
            currentPosition += 1;
        }
        if(current.some(position => squares[currentPosition + position].classList.contains('taken'))){
            currentPosition -= 1;
        }
        draw()
    }

    function rotate(){
        undraw();
        currentRotation++;
        if(currentRotation === 4){
            currentRotation = 0;
        }
        current = theTetrominoes[rand][currentRotation]
        draw()
    }

    // display next
    const displaySquares = document.querySelectorAll('#mini-grid div')
    const displayWidth = 4;
    const displayIndex = 0;
    const upNextTetrominoes = [
        [displayWidth, displayWidth + 1, displayWidth + 2, 2],
        [0, displayWidth, displayWidth + 1, displayWidth * 2 + 1],
        [1, displayWidth, displayWidth + 1, displayWidth + 2],
        [0, 1, displayWidth, displayWidth + 1],
        [1, displayWidth + 1, displayWidth * 2 + 1, displayWidth * 3 + 1],
    ]

    function displayShape(){
        displaySquares.forEach(square =>{
            square.classList.remove('tetromino');
            square.style.backgroundColor = '';

        })
        upNextTetrominoes[nextRandom].forEach(index => {
            displaySquares[index + displayIndex].classList.add('tetromino');
            displaySquares[index + displayIndex].style.backgroundColor = colors[nextRandom];
        })
        
    }


    startBtn.addEventListener('click', ()=>{
        if(timerId){
            clearInterval(timerId)
            timerId = null;
        } else{
            draw();
            timerId = setInterval(moveDown,1000);
            nextRandom = Math.floor(Math.random()*theTetrominoes.length);
            displayShape()
        }

    })

    function addScore(){
        for(let i=0; i < 199; i += width){
            const row = [i, i+1, i+2, i+3, i+4, i+5, i+6, i+7, i+8, i+9]
            if(row.every(index => squares[index].classList.contains('taken'))){
                score += 10;
                scoreDisplay.innerHTML = score;
                row.forEach(index => {
                    squares[index].classList.remove('taken')
                    squares[index].classList.remove('tetromino')
                })

                const squaresRemoved = squares.splice(i,width)
                squares = squaresRemoved.concat(squares)
                squares.forEach(cell => grid.appendChild(cell))
            }
        }
    }

    function gameOver(){
        if(current.some(index => squares[index + currentPosition].classList.contains('taken'))){
            scoreDisplay.innerHTML = 'End';
            clearInterval(timerId);
        }
    }

    const rightBtn = document.getElementById('right-btn')
    rightBtn.addEventListener('click', (e) =>{
        moveRight()
    })

    const leftBtn = document.getElementById('left-btn')
    leftBtn.addEventListener('click', (e) =>{
        moveLeft()
    })

})

