/**
 * @author Darken
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

'use strict';

/* === SLIDER DE RANGO (NO TOCAR) === */
export default class Slider {
    constructor(id, minValue, maxValue) {
        this.startX = 0;
        this.x = 0;

        this.slider = document.querySelector(id);
        this.touchLeft = this.slider.querySelector('.slider-touch-left');
        this.touchRight = this.slider.querySelector('.slider-touch-right');
        this.lineSpan = this.slider.querySelector('.slider-line span');

        this.min = parseFloat(this.slider.getAttribute('min'));
        this.max = parseFloat(this.slider.getAttribute('max'));

        if (!minValue) minValue = this.min;
        if (!maxValue) maxValue = this.max;

        this.minValue = minValue;
        this.maxValue = maxValue;

        this.step = parseFloat(this.slider.getAttribute('step'));

        this.normalizeFact = 18;

        this.reset();

        this.maxX = this.slider.offsetWidth - this.touchRight.offsetWidth;
        this.selectedTouch = null;
        this.initialValue = this.lineSpan.offsetWidth - this.normalizeFact;

        this.setMinValue(this.minValue);
        this.setMaxValue(this.maxValue);

        this.touchLeft.addEventListener('mousedown', (event) => this.onStart(document.querySelector('.slider-touch-left'), event));
        this.touchRight.addEventListener('mousedown', (event) => this.onStart(document.querySelector('.slider-touch-right'), event));
        this.touchLeft.addEventListener('touchstart', (event) => this.onStart(document.querySelector('.slider-touch-left'), event));
        this.touchRight.addEventListener('touchstart', (event) => this.onStart(document.querySelector('.slider-touch-right'), event));
    }

    reset() {
        this.touchLeft.style.left = '0px';
        this.touchRight.style.left = (this.slider.offsetWidth - this.touchLeft.offsetWidth) + 'px';
        this.lineSpan.style.marginLeft = '0px';
        this.lineSpan.style.width = (this.slider.offsetWidth - this.touchLeft.offsetWidth) + 'px';
        this.startX = 0;
        this.x = 0;
    }

    setMinValue(minValue) {
        let ratio = (minValue - this.min) / (this.max - this.min);
        this.touchLeft.style.left = Math.ceil(ratio * (this.slider.offsetWidth - (this.touchLeft.offsetWidth + this.normalizeFact))) + 'px';
        this.lineSpan.style.marginLeft = this.touchLeft.offsetLeft + 'px';
        this.lineSpan.style.width = (this.touchRight.offsetLeft - this.touchLeft.offsetLeft) + 'px';
    }

    setMaxValue(maxValue) {
        var ratio = (maxValue - this.min) / (this.max - this.min);
        this.touchRight.style.left = Math.ceil(ratio * (this.slider.offsetWidth - (this.touchLeft.offsetWidth + this.normalizeFact)) + this.normalizeFact) + 'px';
        this.lineSpan.style.marginLeft = this.touchLeft.offsetLeft + 'px';
        this.lineSpan.style.width = (this.touchRight.offsetLeft - this.touchLeft.offsetLeft) + 'px';
    }

    onStart(elem, event) {
        event.preventDefault();

        if (elem === this.touchLeft)
            this.x = this.touchLeft.offsetLeft;
        else
            this.x = this.touchRight.offsetLeft;

        this.startX = event.pageX - this.x;
        this.selectedTouch = elem;

        let self = this;
        this.func1 = (event) => { this.onMove(event) };
        this.func2 = (event) => { this.onStop(event) };

        document.addEventListener('mousemove', this.func1);
        document.addEventListener('mouseup', this.func2);
        document.addEventListener('touchmove', this.func1);
        document.addEventListener('touchend', this.func2);
    }

    onMove(event) {
        this.x = event.pageX - this.startX;

        if (this.selectedTouch === this.touchLeft) {
            if (this.x > this.touchRight.offsetLeft - this.selectedTouch.offsetWidth - 24)
                this.x = this.touchRight.offsetLeft - this.selectedTouch.offsetWidth - 24;
            else if (this.x < 0)
                this.x = 0;

            this.selectedTouch.style.left = this.x + 'px';
        } else if (this.selectedTouch === this.touchRight) {
            if (this.x < this.touchLeft.offsetLeft + this.touchLeft.offsetWidth + 24) {
                this.x = this.touchLeft.offsetLeft + this.touchLeft.offsetWidth + 24;
            } else if (this.x > this.maxX)
                this.x = this.maxX;

            this.selectedTouch.style.left = this.x + 'px';
        }

        this.lineSpan.style.marginLeft = this.touchLeft.offsetLeft + 'px';
        this.lineSpan.style.width = this.touchRight.offsetLeft - this.touchLeft.offsetLeft + 'px';

        this.calculateValue();
    }

    onStop(self, event) {
        document.removeEventListener('mousemove', this.func1);
        document.removeEventListener('mouseup', this.func2);
        document.removeEventListener('touchmove', this.func1);
        document.removeEventListener('touchend', this.func2);

        this.selectedTouch = null;

        this.calculateValue();
    }

    calculateValue() {
        let newValue = (this.lineSpan.offsetWidth - this.normalizeFact) / this.initialValue;
        let minValue = this.lineSpan.offsetLeft / this.initialValue;
        let maxValue = minValue + newValue;

        minValue = minValue * (this.max - this.min) + this.min;
        maxValue = maxValue * (this.max - this.min) + this.min;

        if (this.step != 0.0) {
            let multi = Math.floor(minValue / this.step);
            this.minValue = this.step * multi;

            multi = Math.floor(maxValue / this.step);
            this.maxValue = this.step * multi;
        }

        this.emit('change', this.minValue, this.maxValue);
    }

    func = [];

    on(name, func) {
        this.func[name] = func;
    }

    emit(name, ...args) {
        if (this.func[name]) this.func[name](...args);
    }
}

/* === SISTEMA DE INSTANCIAS DESDE WEBHOST === */
export async function loadInstances() {
    const container = document.querySelector('.instances');
    if (!container) return console.error("No existe el contenedor .instances en tu HTML");

    container.innerHTML = '<p>Cargando instancias...</p>';

    try {
        const response = await fetch('https://102.129.137.163:5003/main/files/instances/instances.json');  // Cambia esta URL por la tuya
        const instances = await response.json();

        container.innerHTML = '';

        instances.forEach(instance => {
            const item = document.createElement('div');
            item.className = 'instance-item';
            item.innerHTML = `
                <h2>${instance.name}</h2>
                <p>${instance.description}</p>
                <span>Versión: ${instance.version}</span>
            `;

            item.addEventListener('click', () => {
                console.log(`Instancia seleccionada: ${instance.path}`);
                // Aquí puedes poner tu lógica para cambiar de instancia.
            });

            container.appendChild(item);
        });

    } catch (error) {
        console.error('Error al obtener las instancias:', error);
        container.innerHTML = '<p>Error al cargar las instancias.</p>';
    }
}
