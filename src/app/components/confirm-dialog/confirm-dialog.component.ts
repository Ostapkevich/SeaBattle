import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent {
  @Input() message: string = '';
@Input() answer!:boolean;
  @Output() acceptDialog = new EventEmitter<boolean>();
  onAceptDialog(event: any) {
    let id: string = event.target.getAttribute('id');
    if (id === 'btnok') {
      this.answer=true;
      this.acceptDialog.emit();
    } else {
      this.answer=false;
      this.acceptDialog.emit();
    }
  }


}

