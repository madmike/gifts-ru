import { EVENTS } from "src/enums/events.enum";
import { STATE } from "src/enums/states.enum";
import { TAGS } from "src/enums/tags.enum";
import { Writable } from "stream";

export class SaxStream extends Writable {
  private state = STATE.TEXT;
  private buffer = "";
  private pos = 0;
  private tagType = TAGS.NONE;

  _write(chunk, encoding, done) {
    chunk = typeof chunk !== "string" ? chunk.toString() : chunk;

    for (let i = 0; i < chunk.length; i++) {
      let c = chunk[i];
      let prev = this.buffer[this.pos - 1];
      this.buffer += c;
      this.pos++;

      switch (this.state) {
        case STATE.TEXT:
          if (c === "<") this.onStartNewTag();
          break;

        case STATE.TAG_NAME:
          if (prev === "<" && c === "?") {
            this.onStartInstruction();
          }

          if (prev === "<" && c === "/") {
            this.onCloseTagStart();
          }

          if (this.buffer[this.pos - 3] === "<" &&
            prev === "!" &&
            c === "["
          ) {
            this.onCDATAStart();
          }

          if (this.buffer[this.pos - 3] === "<" &&
            prev === "!" &&
            c === "-"
          ) {
            this.onCommentStart();
          }

          if (c === ">") {
            if (prev === "/") {
              this.tagType = TAGS.SELF_CLOSING;
            }
            this.onTagCompleted();
          }
          break;

        case STATE.INSTRUCTION:
          if (prev === "?" && c === ">") {
            this.onEndInstruction();
          }
          break;

        case STATE.CDATA:
          if (this.buffer[this.pos - 3] === "]" && prev === "]" && c === ">") {
            this.onCDATAEnd();
          }
          break;

        case STATE.IGNORE_COMMENT:
          if (this.buffer[this.pos - 3] === "-" &&
            prev === "-" &&
            c === ">"
          ) {
            this.onCommentEnd();
          }
          break;
      }
    }
    done();
  }

  private endRecording() {
    let rec = this.buffer.slice(1, this.pos - 1);
    this.buffer = this.buffer.slice(-1); // Keep last item in buffer for prev comparison in main loop.
    this.pos = 1; // Reset the position (since the buffer was reset)
    return rec;
  }
  
  private onStartNewTag() {
    let text = this.endRecording().trim();
    if (text) {
      this.emit(EVENTS.TEXT, text);
    }
    this.state = STATE.TAG_NAME;
    this.tagType = TAGS.OPENING;
  }
  
  private onTagCompleted() {
    let tag = this.endRecording();

    let _parseTagString2 = this.parseTagString(tag),
      name = _parseTagString2.name,
      attributes = _parseTagString2.attributes;

    if (name === null) {
      this.emit(
        EVENTS.ERROR,
        new Error("Failed to parse name for tag" + tag)
      );
    }

    if (this.tagType && this.tagType == TAGS.OPENING) {
      this.emit(EVENTS.OPEN_TAG, name, attributes);
    }

    if (this.tagType && this.tagType === TAGS.CLOSING) {
      this.emit(EVENTS.CLOSE_TAG, name, attributes);
    }
    if (this.tagType && this.tagType === TAGS.SELF_CLOSING) {
      if (
        Object.keys(attributes).length === 0 &&
        attributes.constructor === Object
      ) {
        //attributes = { ___selfClosing___: true };
      }
      this.emit(EVENTS.OPEN_TAG, name, attributes);
      this.emit(EVENTS.CLOSE_TAG, name, attributes);
    }

    this.state = STATE.TEXT;
    this.tagType = TAGS.NONE;
  }
  
  private onCloseTagStart() {
    this.endRecording();
    this.tagType = TAGS.CLOSING;
  }

  private onStartInstruction() {
    this.endRecording();
    this.state = STATE.INSTRUCTION;
  }

  private onEndInstruction() {
    this.pos -= 1; // Move position back 1 step since instruction ends with '?>'
    let inst = this.endRecording();

    let _parseTagString3 = this.parseTagString(inst),
      name = _parseTagString3.name,
      attributes = _parseTagString3.attributes;

    if (name === null) {
      this.emit(
        EVENTS.ERROR,
        new Error("Failed to parse name for inst" + inst)
      );
    }

    this.emit(EVENTS.INSTRUCTION, name, attributes);
    this.state = STATE.TEXT;
  }
  
  private onCDATAStart() {
    this.endRecording();
    this.state = STATE.CDATA;
  }
  
  private onCDATAEnd() {
    let text = this.endRecording(); // Will return CDATA[XXX] we regexp out the actual text in the CDATA.
    text = text.slice(text.indexOf("[") + 1, text.lastIndexOf("]>") - 1);
    this.state = STATE.TEXT;

    this.emit(EVENTS.CDATA, text);
  }
  
  private onCommentStart() {
    this.state = STATE.IGNORE_COMMENT;
  }

  private onCommentEnd() {
    this.endRecording();
    this.state = STATE.TEXT;
  }

  private parseTagString(str) {
    let name;
    const parsedString = /^([a-zäöüßÄÖÜA-Z0-9:_\-.\/]+?)(\s|$)/.exec(str);

    if (parsedString && parsedString.length > 0) {
      name = parsedString[1];
      const attributesString = str.substr(name.length);
      const attributeRegexp = /([a-zäöüßÄÖÜA-Z0-9:_\-.]+?)="([^"]+?)"/g;
      let match = attributeRegexp.exec(attributesString);
      let attributes = {};
      while (match != null) {
        attributes[match[1]] = match[2];
        match = attributeRegexp.exec(attributesString);
      }

      if (name[name.length - 1] === "/") {
        name = name.substr(0, name.length - 1);
      }

      return { name: name, attributes: attributes };
    }
    return { name: null, attributes: {} };
  }
}