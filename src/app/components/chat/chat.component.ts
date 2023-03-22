import { Component, Output, EventEmitter, ViewChild, ElementRef, Input, AfterViewChecked, AfterViewInit } from '@angular/core';

@Component({
  selector: 'chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],

})
export class ChatComponent implements AfterViewChecked, AfterViewInit {
  // *** переменные для окна приглашения ***
  messageDialog: string = '';  // содержание строки приглашения в окне приглашения
  hiddenDialog = true;  // отображение видимости окна приглашения
  acceptDialog: string = ''; // ответ в окне приглашения 1-да, 2 -нет, 'Приглашение доставлено, но ...'-если не ответил в течении опред. времени
  functionResponse!: Function; // замыкание
  timingString: string = ''; //строка тайминга (20/20) для шаблона в окне приглашения
  // *** 
  usersObj: { [key: string]: string } = {}; //подключенные на сервере противники
  usersArray: any[] = []; // дублирует usersObj для построения шаблона HTML
  socket: any;
  myName: string = ''; // имя игрока 
  enemyName = ''; //имя выбранного врага для отображения в шаблоне HTML
  enemyId = ''; //id выбранного врага
  messageTo = ''; // для отображения в шаблоне HTML кому пишется сообщение
  block = false;//используется для блокировок во время приглашения к игре
  answer = false;// был ли дан ответ в окне приглашения в течении определенного вреени
  timeInvite = "";
  intv: any;
  aud: any;
  arrDialog: Array<Array<string>> = [];
  lblInput!: any;

  constructor() {
    this.socket = io();
    this.socket.on('printing', (idFrom: string) => {
      if (idFrom === this.playerSelectElnt.value) {
        this.lblInput.innerHTML = ':' + this.usersArray[this.playerSelectElnt.selectedIndex][1] + 'печатает';
        setTimeout(() => {
          this.lblInput.innerHTML = ':' + this.usersArray[this.playerSelectElnt.selectedIndex][1];
        }, 500);
      }
    })

    this.socket.on("addExistingUsers", (users: any) => {
      Object.assign(this.usersObj, users);
      this.updateUsersArray();
    });

    this.socket.on("addNewUser", (user: { [key: string]: string }) => {
      Object.assign(this.usersObj, user);
      this.updateUsersArray();
    });

    this.socket.on('inviteToPlay', (senderId: string) => {

      function soundInvite() {
        var audio = new Audio();
        audio.src = './assets/war.mp3';
        audio.autoplay = true;
        return audio;
      }

      this.aud = soundInvite();

      this.block = true;
      this.answer = false;
      setTimeout(() => {
        if (this.answer === false) {
          this.block = false;
          this.answer = true;
          this.acceptDialog = 'Приглашение доставлено, но ' + this.myName + ' не отвечает.';
          this.functionResponse();
        }
      }, 22000);

      this.messageDialog = 'Пользователь ' + this.usersObj[senderId] + ' приглашает вас играть. Принять запрос?'
      this.hiddenDialog = false;

      let i = 20;

      let interval = setInterval(() => {
        if (i > 0) {
          this.timingString = `${i}/20`;
        } else {
          this.timingString = `${i}/20. Время ответа истекло.`;
          clearInterval(interval);
        }
        i--;
      }, 1000);
      this.functionResponse = function (this: ChatComponent) {
        this.socket.timeout(30000).emit('invitationResponse', senderId, this.acceptDialog, (err: Error, response: { status: string }) => {
          if (err) {
            this.block = false;
            alert('Проблемы с интернет соединением или удаленный сервер не доступен!.')
          } else {
            if (response.status === 'ok' && this.acceptDialog === '1') {
              this.enemyId = senderId;
              this.enemyName = this.usersObj[senderId];
              this.playChange.emit(true);
              this.shotChange.emit(false);
              this.onMoveChange.emit('Стреляет противник');
            } else if (response.status !== 'ok' && this.acceptDialog === '1') {
              this.block = false;
              alert(response.status);
            }
          }
        });
      }
    });

    this.socket.on('invitationResponse', (id: string, acceptDialog: string) => {
      if (acceptDialog === '1') {
        clearInterval(this.intv);
        this.timeInvite = '';
        this.enemyId = id;
        this.enemyName = this.usersObj[id];
        this.onMoveChange.emit('Ваш выстрел');
        this.shotChange.emit(true);
        alert(this.enemyName + ' принял ваш запрос');
      } else if (acceptDialog === '2') {
        clearInterval(this.intv);
        this.timeInvite = '';
        this.block = false;
        this.playChange.emit(false);
        alert(this.usersObj[id] + ' отклонил ваш запрос');
      } else {
        clearInterval(this.intv);
        this.timeInvite = '';
        this.block = false;
        this.playChange.emit(false);
        alert(acceptDialog);
      }
    });

    this.socket.on('statusTwoPlayersBusy', (id1: string, id2: string) => {
      if (Object.hasOwn(this.usersObj, id1)) { this.usersObj[id1] = this.usersObj[id1].replace('🟢', '🔵'); }
      if (Object.hasOwn(this.usersObj, id2)) { this.usersObj[id2] = this.usersObj[id2].replace('🟢', '🔵'); }
      this.updateUsersArray();
      if (this.socket.id === id1 || this.socket.id === id2) {
        this.onMyName.emit(this.myName + '🔵');
        this.enemyName = this.enemyName.replace('🟢', '🔵');
      }
    })

    this.socket.on('mePlayMarkFalse', (id: string) => {
      this.usersObj[id] = this.usersObj[id].replace('🔵', '🟢');
      this.updateUsersArray();
    });

    this.socket.on('quitUser', (id: string) => {
      delete this.usersObj[id];
      this.updateUsersArray();
      if (this.block && this.enemyId === id) {
        this.enemyId = '';
        this.enemyName = '';
        this.block = false;
        this.playChange.emit(false);
        this.onMyName.emit(this.myName + '🟢');
        this.socket.emit('mePlayMarkFalse');
        this.onMoveChange.emit('Расставьте корабли');
        alert('Противник покинул игру.');
        if (this.play) {
          this.onUpdate.emit();
        }
       
    
      }

    });

    this.socket.on('messageToUser', (idFrom: string, between: string, usrMessage: string, idMessage: string) => {
      this.socket.emit('gotAnswer', idFrom, between, usrMessage, idMessage, (response: { status: string }) => {
        if (response.status === 'ok') {
          this.arrDialog.push([idFrom, between, usrMessage, '1', idMessage]);
          var audio = new Audio();
          audio.src = './assets/message.mp3';
          audio.autoplay = true;
        } else {
          alert(response.status);
        }
      });
    });

    this.socket.on('gotAnswer', (idMessage: string) => {
      for (const dialog of this.arrDialog) {
        if (dialog[4] === idMessage) {
          dialog[3] = '2';
        }
      }

    });


  }
  ngAfterViewChecked(): void {
    let uList: any;
    uList = document.getElementById('msgUl');
    uList.scrollTop = uList.scrollHeight;
  }

  ngAfterViewInit(): void {
    this.lblInput = document.getElementById('lblPrint');
  }

  @Input() chatDesc: any;


  @ViewChild("inpMessage", { static: false })
  inpMsg!: ElementRef;

  @ViewChild("inpName", { static: false })
  inpName!: ElementRef;

  @ViewChild("selectPlayer", { static: false })
  slctPlayer!: ElementRef;
  playerSelectElnt!: HTMLSelectElement;

  @Input() play: boolean = false;
  @Output() playChange = new EventEmitter<boolean>();

  @Input() shot!: boolean;
  @Output() shotChange = new EventEmitter<boolean>();

  @Output() onMyName = new EventEmitter<string>();

  @Output() onUpdate=new EventEmitter;

  @Input() onMove: string = '';
  @Output() onMoveChange = new EventEmitter<string>();

  dialogOk() {
    if (this.block === true) {
      this.acceptDialog = '1';
      this.hiddenDialog = true;
      this.answer = true;
      this.aud.pause();
      this.functionResponse();
    }
  }

  dialogNo() {
    if (this.block === true) {
      this.answer = true;
      this.block = false;
      this.acceptDialog = '2';
      this.hiddenDialog = true;
      this.aud.pause();
      this.functionResponse();
    }
  }

  dialogClose() {
    if (this.block === false) {
      this.hiddenDialog = true;
      this.aud.pause();
    }
  }

  updateUsersArray() {
    this.usersArray.length = 0;
    for (const key in this.usersObj) {
      this.usersArray.push([key, this.usersObj[key]]);
    }
  }

  createUser() {
    if (this.inpName.nativeElement.disabled === false && this.inpName.nativeElement.value !== '') {
      this.socket.timeout(5000).emit('createNewUser', this.myName, (err: Error, response: { status: string }, users: Object) => {
        if (err) {
          alert(err.message)
        }
        if (response.status === "ok") {
          Object.assign(this.usersObj, users);
          this.updateUsersArray();
          this.inpName.nativeElement.disabled = true;
          this.onMyName.emit(this.myName + '🟢');
        } else {
          alert(response.status);
        }
      });
    }
  }

  inpNameEnter(event: KeyboardEvent) {
    if (event.code === 'Enter') {
      this.createUser();
    }
  }

  invatePlayer() {
    if (this.block === false) {
      this.block = true;
      this.playChange.emit(true);
      this.playerSelectElnt = this.slctPlayer.nativeElement;
      if (this.usersObj[this.playerSelectElnt.value].lastIndexOf('🔵') > 0) {
        alert('Данный игрок уже играет!');
        return;
      }
      if (this.playerSelectElnt.selectedIndex >= 0) {
        this.messageTo = '';
        this.timingString = '';
        let i = 0;
        this.intv = setInterval(() => {
          if (i < 40) {
            if (i < 10) {
              this.timeInvite = `Ожидание - 0${i} сек.`;
            } else {
              this.timeInvite = `Ожидание - ${i} сек.`;
            }
          } else {
            clearInterval(this.intv);
            this.timeInvite = '';
          }
          i++;
        }, 1000);

        this.socket.timeout(30000).emit('inviteToPlay', this.playerSelectElnt.value, (err: Error, response: { status: string }) => {
          if (err) {
            this.block = false;
            this.playChange.emit(false);
            clearInterval(this.intv);
            this.timeInvite = '';
            alert('Запрос не доставлен. Возможно проблемы с интернет соединением или удаленный сервер не доступен. ' + err.message);
          } else if (response.status !== 'ok') {
            clearInterval(this.intv);
            this.timeInvite = '';
            this.block = false;
            this.playChange.emit(false);
            alert(response.status);
          }
        });
      }
    } else {
      alert('В данный момент функция не активна.');
    }
  }

  sendMessage(event: KeyboardEvent) {
    this.playerSelectElnt = this.slctPlayer.nativeElement;
    if (event.code === 'Enter') {
      this.sendMsg();
    } else {
      this.socket.emit('printing', this.playerSelectElnt.value);
    }
  }

  sendMsg() {
    if (this.playerSelectElnt.selectedIndex >= 0) {
      let name2: string = this.usersArray[this.playerSelectElnt.selectedIndex][1];
      name2 = name2.slice(0, name2.length - 2);
      let between: string = this.myName + '-' + name2;
      let usrMessage: string = this.inpMsg.nativeElement.value;
      this.inpMsg.nativeElement.disabled = true;
      let idMessage = String(Math.random());
      this.socket.timeout(30000).emit('messageToServer', this.playerSelectElnt.value, between, usrMessage, idMessage, (err: Error, response: { status: string }) => {
        if (err) {
          this.inpMsg.nativeElement.disabled = false;
          alert('Сообщение не доставлено. Возможно проблемы с интернет соединением или удаленный сервер не доступен. ' + err.message);
        } else {
          if (response.status == "ok") {
            this.inpMsg.nativeElement.disabled = false;
            this.inpMsg.nativeElement.value = '';
            this.inpMsg.nativeElement.focus();
            this.arrDialog.push([this.socket.id, between, usrMessage, '1', idMessage]);
          } else {
            this.inpMsg.nativeElement.disabled = false;
            alert('Сообщение не доставлено. ' + response.status);
          }
        }
      });
    } else {
      alert('Выберите имя игрока.')
    }
  }

  changePlayer() {
    this.playerSelectElnt = this.slctPlayer.nativeElement;
    const n = this.playerSelectElnt.selectedIndex;
    if (n >= 0) {
      this.messageTo = ' ' + this.playerSelectElnt.item(n)?.innerHTML;
    }

  }


}