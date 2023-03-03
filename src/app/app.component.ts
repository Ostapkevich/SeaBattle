import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ChatComponent } from './components/chat/chat.component';


class Ship {
  shipCount: number;
  shipId: string;
  direction: string;
  1: boolean;
  2: boolean;
  3: boolean;
  4: boolean;

  constructor(count: number, pbegin: string, pdirection: string = 'hor',
  ) {
    this.shipCount = count;
    this.shipId = pbegin;
    this.direction = pdirection;
    this[1] = true;
    this[2] = true;
    this[3] = true;
    this[4] = true;
  }

  static getDivId(ship: Ship, index: number): string {   //возвращает id Div секции корабля по переданному номеру секции 
    let id = '';
    if (ship.direction === 'hor') {
      id = 'c' + (+ship.shipId[1] + index) + ship.shipId[2];
    } else {
      id = 'c' + ship.shipId[1] + (+ship.shipId[2] + index);
    }
    return id;
  }


}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements AfterViewInit {
  title = 'SeaBattle';
  items: string[] = [];
  four = new Ship(4, 'c00');
  three1 = new Ship(3, 'c02');
  three2 = new Ship(3, 'c04');
  two1 = new Ship(2, 'c06');
  two2 = new Ship(2, 'c36');
  two3 = new Ship(2, 'c66');
  one1 = new Ship(1, 'c08');
  one2 = new Ship(1, 'c28');
  one3 = new Ship(1, 'c48');
  one4 = new Ship(1, 'c68');
  ships = [this.four, this.three1, this.three2, this.two1, this.two2, this.two3, this.one1, this.one2, this.one3, this.one4];
  moving = false;    // идет перетаскивание корабля или нет
  trackingStartPoint: number[] = []; // координата выбранного divа (части корабля)корабля, начало перемещения
  trackingShipId: number[] = [];  // перемещаемый корабль
  tempShipId: number[] = []; //  временное id, для проверки не попадает ли корабль в месте нового расположения в мертвую зону
  tempDirection = '';
  returnedShipId: number[] = [];  // координата бегин при первом клике, нужна для возврата, если нажмется escape
  returnedDirection = '';
  excludeArray: Array<Array<number>> = [];
  outOfPerimetr: Array<Array<number>> = [];
  play: boolean = false;
  canShot!: boolean;
  //******* игра************
  messageAction = 'Расставте корабли';
  desk:boolean = true

  @ViewChild("square1", { static: false })
  squareRef: ElementRef | undefined;
  squere1Element: any;

  @ViewChild("square2", { static: false })
  square2Ref: ElementRef | undefined;
  squere2Element: any;

  @ViewChild("myNameElement", { static: false })
  myNameElnt: ElementRef | undefined;

  @ViewChild(ChatComponent, { static: false })
  private chat!: ChatComponent;

  constructor() {
    
    let i = 0;
    let j = 0;
    while (i < 10) {
      j = 0;
      while (j < 10) {
        this.items.push(String(j) + String(i)); //массив по которому будет построен компонент из 100 div х 100 div
        j++;
      }
      i++;
    }

    for (let i = -3; i <= -1; i++) {
      for (let j = -3; j <= 12; j++) {
        this.outOfPerimetr.push([j, i]);
      }
    }
    for (let i = 10; i <= 12; i++) {
      for (let j = -3; j <= 12; j++) {
        this.outOfPerimetr.push([j, i]);
      }
    }
    for (let i = -3; i <= -1; i++) {
      for (let j = 0; j <= 9; j++) {
        this.outOfPerimetr.push([i, j]);
      }
    }
    for (let i = 10; i <= 12; i++) {
      for (let j = 0; j <= 9; j++) {
        this.outOfPerimetr.push([i, j]);
      }
    }

  }


  ngAfterViewInit(): void {
    this.squere1Element = this.squareRef?.nativeElement;
    this.squere2Element = this.square2Ref?.nativeElement;
    for (const ship of this.ships) {
      this.changeShipStyle(ship, 'colorShip');
    }
   
    this.squere1Element.addEventListener('click', this.mouseClick_SelectShip.bind(this));
    this.squere2Element.addEventListener('click', this.shot.bind(this));
    this.squere1Element.addEventListener('mouseover', this.mouseOver_moveShip.bind(this));
    window.document.addEventListener('keydown', this.canselMove.bind(this));
    window.document.addEventListener('wheel', this.rotate.bind(this));

    this.chat.socket.on('shot', (coord: string, callback) => {
      let findResult = this.catchShot(coord);
      let element: HTMLDivElement = this.squere1Element.querySelector('#' + coord);
      element.innerHTML = '🔵';
      callback(findResult);
      if (findResult.foundCoord === true && findResult.gameСontinue === false) {
        this.soundPopadanie();
        this.messageAction = 'Вы проиграли';
        this.update();
      } else if (findResult.foundCoord === false) {
        this.soundMimo();
        this.canShot = true;
        this.messageAction = 'Ваш выстрел'
      }
    });

    
  }

  changeShipStyle(ship: Ship, sort: 'colorShip' | 'colorSelectedShip' | 'unColor' | 'selectBorder' | 'unselectBorder') {
    let elem: HTMLDivElement;
    for (let index = 0; index < ship.shipCount; index++) {
      let id: string = Ship.getDivId(ship, index);
      elem = this.squere1Element.querySelector('#' + id);
      switch (sort) {
        case 'colorShip':
          elem.style.backgroundColor = '#E85625';
          break;
        case 'colorSelectedShip':
          if (+id[1] === this.trackingStartPoint[0] && +id[2] === this.trackingStartPoint[1]) {
            elem.style.backgroundColor = '#7A6B2F';
          } else {
            elem.style.backgroundColor = '#facc15';
          }
          break;
        case 'unColor':
          elem.style.backgroundColor = '#0ea5e9';
          break;
        case 'selectBorder':
          elem.style.borderWidth = '3px';
          break;
        case 'unselectBorder':
          elem.style.borderWidth = '';
          break;
      }
    }
  }

  mouseOver_boderShip(event: any) {
    if (this.play === false) {
      let id: string = event.target.getAttribute('id');
      if (id === 'shipsField' || this.trackingShipId.length > 0) { return; }
      for (const ship of this.ships) {
        for (let index = 0; index < ship.shipCount; index++) {
          if (id === Ship.getDivId(ship, index)) {
            this.changeShipStyle(ship, 'selectBorder');
            return;
          } else {
            for (const ship of this.ships) {
              for (let index = 0; index < ship.shipCount; index++) {
                this.changeShipStyle(ship, 'unselectBorder');
              }
            }
          }
        }
      }
    }
  }

  mouseClick_SelectShip(event: any) {
    if (this.play === false && this.moving === false) {
      let id: string = event.target.getAttribute('id');
      if (id === 'shipsField') { return; }
      for (const ship of this.ships) {
        for (let index = 0; index < ship.shipCount; index++) {
          if (id === Ship.getDivId(ship, index)) {
            this.moving = true;
            this.trackingStartPoint = [+id[1], +id[2]];
            this.trackingShipId = [+ship.shipId[1], +ship.shipId[2]];
            this.returnedShipId[0] = this.trackingShipId[0];
            this.returnedShipId[1] = this.trackingShipId[1];
            this.returnedDirection = ship.direction;
            this.excludeArray.length = 0;
            this.createExcludeArray();
            this.changeShipStyle(this.getShipById(this.trackingShipId), 'colorSelectedShip');
            this.changeShipStyle(this.getShipById(this.trackingShipId), 'unselectBorder');
            return;
          }
        }
      }
    } else {
      this.moving = false;
      this.mouseClick_EndMoveShip();
      this.trackingShipId.length = 0;
    }
  }

  mouseClick_EndMoveShip() {
    this.changeShipStyle(this.getShipById(this.trackingShipId), 'colorShip');
    this.excludeArray.length = 0;
  }

  mouseOver_moveShip(event: any) {
    if (this.play === false && this.moving && event.target.getAttribute('id') !== 'shipsField') {
      let id: string = event.target.getAttribute('id');
      let target: number[] = [+id[1], +id[2]];
      if (this.IsIncludeShipZone(target, 'move') === false) {
        const ship = this.getShipById(this.trackingShipId);
        this.changeShipStyle(ship, 'unColor');
        this.trackingShipId[0] = this.tempShipId[0];
        this.trackingShipId[1] = this.tempShipId[1];
        ship.shipId = 'c' + this.tempShipId[0] + this.tempShipId[1];

        this.trackingStartPoint[0] = target[0];
        this.trackingStartPoint[1] = target[1];
        this.changeShipStyle(ship, 'colorSelectedShip');
      }
    }

  }

  rotate() {
    if (this.play === false && this.moving) {
      if (this.IsIncludeShipZone(this.trackingShipId, 'rotate') === false) {
        const ship = this.getShipById(this.trackingShipId);
        this.changeShipStyle(ship, 'unColor');
        this.trackingShipId[0] = this.tempShipId[0];
        this.trackingShipId[1] = this.tempShipId[1];
        ship.shipId = 'c' + this.tempShipId[0] + this.tempShipId[1];
        ship.direction = this.tempDirection;
        this.changeShipStyle(ship, 'colorSelectedShip');
      }
    }
  }

  IsIncludeShipZone(target: number[], typeOfMove: 'move' | 'rotate'): boolean {  // попадает ли перетаскиваемый корабль в запрещенную зону
    const ship: Ship = this.getShipById(this.trackingShipId); // еще не перемещенный трекинговый корабль
    let delta: number;
    let findresult: any;

    if (typeOfMove === 'move') {
      const deltaX: number = target[0] - this.trackingStartPoint[0];
      const deltaY: number = target[1] - this.trackingStartPoint[1];
      this.tempShipId = [+ship.shipId[1] + deltaX, +ship.shipId[2] + deltaY];
      this.tempDirection = ship.direction;
    } else {
      const x: number = this.trackingShipId[0];
      const y: number = this.trackingShipId[1];
      if (ship.direction === 'hor') {
        this.tempShipId[0] = this.trackingStartPoint[0];
        this.tempShipId[1] = this.trackingStartPoint[1] + (x - this.trackingStartPoint[0]);
        this.tempDirection = 'ver';
      } else {
        this.tempShipId[0] = this.trackingStartPoint[0] + (y - this.trackingStartPoint[1]);
        this.tempShipId[1] = this.trackingStartPoint[1];
        this.tempDirection = 'hor';
      }
    }

    if (ship.shipCount === 1) {
      findresult = this.excludeArray.find((item: number[]) => {
        if ((item[0] === this.tempShipId[0] && item[1] === this.tempShipId[1])) {
          return true;
        } else {
          return false;
        }
      });
    } else if (this.tempDirection === 'hor') {
      delta = this.tempShipId[0] + ship.shipCount - 1;
      findresult = this.excludeArray.find((item: number[]) => {
        if ((item[0] === this.tempShipId[0] && item[1] === this.tempShipId[1]) || (item[0] === delta && item[1] === this.tempShipId[1])) {
          return true;
        } else {
          return false;
        }
      });
    } else {
      delta = this.tempShipId[1] + ship.shipCount - 1;
      findresult = this.excludeArray.find((item: number[]) => {
        if ((item[0] === this.tempShipId[0] && item[1] === this.tempShipId[1]) || (item[0] === this.tempShipId[0] && item[1] === delta)) {
          return true;
        } else {
          return false;
        }
      });
    }
    return Boolean(findresult);
  }

  getShipById(id: number[]): Ship {
    let retunedship: any;
    for (const ship of this.ships) {
      if (ship.shipId === 'c' + id[0] + id[1]) {
        retunedship = ship;
        break;
      }
    }
    return retunedship;
  }

  createExcludeArray() {                                    //массив с координатами куда нельзя перемещаться
    for (const ship of this.ships) {                        // вокруг каждого корабля кроме перетаскиваемого рассчитывает вокруг него мертвую зону и добавляет в массив
      if (ship.shipId === 'c' + this.trackingShipId[0] + this.trackingShipId[1]) { continue } // для однопалубного карабля
      const startX = +ship.shipId[1] - 1;
      const startY = +ship.shipId[2] - 1;
      if (ship.direction === 'ver') {                       // для кораблей с вертикальным расположением
        for (let i = 0; i < ship.shipCount + 2; i++) {
          for (let j = 0; j < 3; j++) {
            this.excludeArray.push([startX + j, startY + i]);
          }
        }
      } else {                                             // для кораблей с горизонтальным расположением
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < ship.shipCount + 2; j++) {
            this.excludeArray.push([startX + j, startY + i]);
          }
        }
      }
    }
    for (const item of this.outOfPerimetr) { //добавляет запрещенные координаты из постоянного набора outOfPerimetr-заа пределами поля боя
      this.excludeArray.push(item);
    }

  }

  canselMove(event: KeyboardEvent) {
    if (this.play === false && event.code === 'Escape') {
      if (this.moving) {
        const ship: Ship = this.getShipById(this.trackingShipId);
        this.changeShipStyle(ship, 'unColor');
        ship.shipId = 'c' + this.returnedShipId[0] + this.returnedShipId[1];
        ship.direction = this.returnedDirection;
        this.changeShipStyle(ship, 'colorShip');
        this.moving = false;
        this.trackingShipId.length = 0;
      }
    }
  }

  setName(name: string) {
    if (this.myNameElnt) {
      this.myNameElnt.nativeElement.innerHTML = 'Вы : ' + name;
    }
  }

  shot(event: any) {
    if (this.play === true && this.canShot === true) {
      let element: HTMLDivElement = event.target;
      if (element.innerHTML === '🔴') {
        return
      }
      let coord: string = element.id;
      if (coord === 'battleField') { return; }
      this.chat.socket.timeout(30000).emit('shot', this.chat.enemyId, coord.replace('p', 'c'), (err: Error, response: { foundCoord: boolean, gameСontinue: boolean, errorMessage: string }) => {
        if (err) {
          alert('Проблемы с интернет соединением или удаленный сервер не доступен! ' + err.message)
        } else if (response.errorMessage) {
          alert(response.errorMessage);
        } else {
          element.innerHTML = '🔴';
          if (response.foundCoord === true && response.gameСontinue === true) {

            element.style.backgroundColor = '#265369';
            this.soundPopadanie();
          } else if (response.foundCoord === true && response.gameСontinue === false) {
            element.style.backgroundColor = '#265369';
            this.soundPopadanie();
            this.canShot = false;
            this.messageAction = 'Вы выиграли';
            this.update();
          } else if (response.foundCoord === false && response.gameСontinue === true) {
            this.soundMimo();
            this.canShot = false;
            this.messageAction = 'Стреляет противник';
          }

        }
      });
    }
  }

  catchShot(coord: string): { foundCoord: boolean, gameСontinue: boolean } {
    let fCoord: boolean = false;
    let gСontinue: boolean = false;

    for (const ship of this.ships) {
      for (let index = 0; index < ship.shipCount; index++) {

        if (fCoord === false) {
          let id: string = Ship.getDivId(ship, index);
          if (id === coord) {
            fCoord = true;
            switch (index) {
              case 0:
                ship[1] = false;
                break;
              case 1:
                ship[2] = false;
                break;
              case 2:
                ship[3] = false;
                break;
              case 3:
                ship[4] = false;
                break;
            }
          }
        }

        if (gСontinue === false) {
          switch (index) {
            case 0:
              if (ship[1] === true) {
                gСontinue = true;
              }
              break;
            case 1:
              if (ship[2] === true) {
                gСontinue = true;
              }
              break;
            case 2:
              if (ship[3] === true) {
                gСontinue = true;
              }
              break;
            case 3:
              if (ship[4] === true) {
                gСontinue = true;
              }
              break;
          }
        }
      }
    }
    return { foundCoord: fCoord, gameСontinue: gСontinue };
  }
  i = 5;
  update() {
    this.play = false;
    this.chat.block = false;
    this.chat.socket.emit('mePlayMarkFalse');
    for (const ship of this.ships) {
      ship[1] = true;
      ship[2] = true;
      ship[3] = true;
      ship[4] = true;
    }

    let interval = setInterval(() => {
      let timeElement = document.getElementById('timeOver');
      if (this.i >= 0) {
        if (timeElement) {
          timeElement.innerHTML = `${this.i}/5`;
        }
      } else {
        clearInterval(interval);
        this.i = 5;
        if (timeElement) {
          timeElement.innerHTML = ``;
        }
      }
      this.i--;
    }, 1000);

    setTimeout(() => {
      for (const el of this.squere1Element.children) {
        el.innerHTML = '';
      }
      for (const el of this.squere2Element.children) {
        el.innerHTML = '';
        el.style.backgroundColor = 'rgb(14 165 233)'
      }
      this.messageAction = 'Расставте корабли';
      this.chat.enemyName = "";
      this.chat.enemyId = '';

      if (this.myNameElnt) {
        let meElement: any;
        meElement = document.getElementById('me');
        meElement.innerHTML = 'Вы : ' + this.chat.myName + '🟢'
      }
    }, 7000);
  }

  soundPopadanie() {
    var audio = new Audio();
    audio.src = './assets/popadanie.mp3';
    audio.autoplay = true;
  }

  soundMimo() {
    var audio = new Audio();
    audio.src = './assets/mimo.mp3';
    audio.autoplay = true;
  }

}
