// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...}

import Noel from 'noel';
import { NoelEvent } from 'noel/dist/types/event';
import { NoelConfig } from 'noel/dist/types/interfaces';
import { NoelEventListener } from 'noel/dist/types/types';
import { NoelEventListenerManager } from 'noel/dist/types/event-listener-manager';

/**
 * @author Joel Hernandez <lifenautjoe@gmail.com>
 */

export default class Droppable {
    private dragOverClass = 'dragover';

    private static readonly Noel = Noel;

    private appendStatusClasses: boolean;
    private isClickable: boolean;

    private filesWereDroppedEvent: NoelEvent;
    private element: HTMLElement;

    private elementEventsRemover: Function;

    private virtualInputElement: HTMLInputElement;
    private virtualInputElementEventsRemover: Function;

    private latestDroppedFiles: File[];

    private eventEmitter: Noel;

    constructor(config: DroppableSettings) {
        config = config || {};

        if (!config.element) {
            throw new Error('config.element: HTMLElement is required');
        }

        // This must be called before calling setAcceptsMultipleFiles
        this.virtualInputElement = Droppable.makeVirtualInputElement();

        const isClickable = typeof config.isClickable === 'boolean' ? config.isClickable : true;
        const acceptsMultipleFiles = typeof config.acceptsMultipleFiles === 'boolean' ? config.acceptsMultipleFiles : true;
        const appendStatusClasses = typeof config.appendStatusClasses === 'boolean' ? config.appendStatusClasses : true;

        this.setIsClickable(isClickable);
        this.setAcceptsMultipleFiles(acceptsMultipleFiles);
        this.setAppendStatusClasses(appendStatusClasses);

        this.eventEmitter = new Droppable.Noel(
            config.eventConfig || {
                replay: true,
                replayBufferSize: 1
            }
        );

        this.filesWereDroppedEvent = this.eventEmitter.getEvent('drop');

        this.element = config.element;
        this.elementEventsRemover = this.registerElementEvents();

        this.virtualInputElementEventsRemover = this.registerVirtualInputElementEvents();
    }

    private static makeVirtualInputElement() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.style.display = 'none';
        return input;
    }

    onFilesDropped(listener: NoelEventListener): NoelEventListenerManager {
        return this.filesWereDroppedEvent.on(listener);
    }

    cleanUp() {
        this.elementEventsRemover();
        this.virtualInputElementEventsRemover();
    }

    getLatestDroppedFiles(): File[] {
        if (this.latestDroppedFiles) {
            return this.latestDroppedFiles;
        }
        return [];
    }

    promptForFiles(): void {
        this.virtualInputElement.click();
    }

    setIsClickable(clickable: boolean) {
        this.isClickable = clickable;
    }

    setAcceptsMultipleFiles(acceptsMultipleFiles: boolean) {
        this.virtualInputElement.setAttribute('multiple', acceptsMultipleFiles.toString());
    }

    setAppendStatusClasses(appendStatusClasses: boolean) {
        this.appendStatusClasses = appendStatusClasses;
    }

    private registerElementEvents(): Function {
        const eventNameToEventListenerDictionary = this.getElementEventsDictionary();
        return this.registerElementEventsWithDictionary(this.element, eventNameToEventListenerDictionary);
    }

    private registerVirtualInputElementEvents(): Function {
        const eventNameToEventListenerDictionary = this.getVirtualInputElementEventsDictionary();
        return this.registerElementEventsWithDictionary(this.virtualInputElement, eventNameToEventListenerDictionary);
    }

    private getVirtualInputElementEventsDictionary() {
        return {
            change: this.onVirtualInputElementChange
        };
    }

    private getElementEventsDictionary() {
        return {
            dragover: this.onElementDragOver,
            dragleave: this.onElementDragLeave,
            drop: this.onElementDrop,
            click: this.onElementClick
        };
    }

    private onElementDragOver(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        this.element.classList.add(this.dragOverClass);
    }

    private onElementDragLeave(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        this.element.classList.remove(this.dragOverClass);
    }

    private onElementDrop(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        this.element.classList.remove(this.dragOverClass);
        this.onDroppableElementChange(e);
    }

    private onElementClick() {
        if (this.isClickable) this.promptForFiles();
    }

    private onVirtualInputElementChange(e: Event) {
        this.onDroppableElementChange(e);
    }

    private onDroppableElementChange(event: { [key: string]: any }) {
        let files;
        if (event['dataTransfer']) {
            files = event['dataTransfer'].files;
        } else if (event['target']) {
            files = event['target'].files;
        } else {
            throw Error('Fired event contains no files');
        }

        // Files is FileList, we convert to array
        const filesArray: File[] = Array.from(files);
        this.setLatestDrop(filesArray);
    }

    private setLatestDrop(files: Array<File>) {
        this.latestDroppedFiles = files;
        this.emitFilesWereDropped(files);
    }

    private emitFilesWereDropped(files: Array<File>) {
        this.filesWereDroppedEvent.emit(files);
    }

    private registerElementEventsWithDictionary(element: HTMLElement, eventNameToEventListenerDictionary: { [key: string]: EventListener }): Function {
        const eventRemovers: Array<Function> = [];
        Object.keys(eventNameToEventListenerDictionary).forEach(eventName => {
            const eventListener = eventNameToEventListenerDictionary[eventName];
            element.addEventListener(eventName, eventListener.bind(this));
            eventRemovers.push(() => element.removeEventListener(eventName, eventListener));
        });

        return () => eventRemovers.forEach(eventRemover => eventRemover());
    }
}

export interface DroppableSettings {
    element: HTMLElement;
    appendStatusClasses?: boolean;
    acceptsMultipleFiles?: boolean;
    isClickable?: boolean;
    eventConfig?: NoelConfig;
}
