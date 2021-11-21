'use strict';

// prettier-ignore

const containerWorkouts = document.querySelector('.workouts');

//form
const form = document.querySelector('.form');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
//delete button
const deleteAllButton = document.querySelector('.delete-all');
//Sort elements
const sortBtn = document.querySelector('.btn-sort');
const dropdown = document.querySelector('.dropdown-content');
const sortDate = dropdown.querySelector('.sort-date');
const sortType = dropdown.querySelector('.sort-type');
const sortDistance = dropdown.querySelector('.sort-distance');
const sortDuration = dropdown.querySelector('.sort-duration');
const zoomAll = document.querySelector('.btn-zoom');
//modal
const modal = document.querySelector('.modal');
const modalContent = modal.querySelector('.modal-content');
const modalInfo = modal.querySelector('.modal-information');
let modalType = '';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //in km
    this.duration = duration; // in min
  }
  _setDescription() {
    //prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);
///////////////////////////////////////////////////////////////////////
//Application Architecture
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #currentWorkout;

  constructor() {
    //get users position
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();

    //Attach event handlers

    window.addEventListener('click', this._focus.bind(this));
    form.addEventListener('submit', this._updateUI.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    sortBtn.addEventListener('click', this._dropdown.bind(this));
    dropdown.addEventListener('click', this._sort.bind(this));
    zoomAll.addEventListener('click', this._focusAll.bind(this));
    deleteAllButton.addEventListener(
      'click',
      function () {
        modalType = 'deleteAll';
        this._openModal();
      }.bind(this)
    );
  }
  _focus(e) {
    const focus = e.target;
    if (focus !== sortBtn) {
      dropdown.classList.add('hidden');
    }
    // this._focusAll();
  }

  _focusAll(e) {
    // console.log(this.#workouts[0].coords[0]);
    let maxLat = this.#workouts[0].coords[0];
    let maxLng = this.#workouts[0].coords[1];
    let minLat = this.#workouts[0].coords[0];
    let minLng = this.#workouts[0].coords[1];
    this.#workouts.forEach(work => {
      if (work.coords[0] > maxLat) maxLat = work.coords[0];
      if (work.coords[1] > maxLng) maxLng = work.coords[1];
      if (work.coords[0] < minLat) minLat = work.coords[0];
      if (work.coords[1] < minLng) minLng = work.coords[1];
    });
    console.log(maxLat, maxLng, minLat, minLng);
    this.#map.fitBounds([
      [minLat, maxLng],
      [maxLat, minLng],
    ]);
  }

  _dropdown(e) {
    dropdown.classList.toggle('hidden');
  }

  _getPosition(e) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          modalType = 'location';
          this._openModal();
        }.bind(this)
      );
    }
  }

  _sort(e) {
    const sortBy = e.target.closest('.sort');

    if (sortBy === sortDate) {
      this.#workouts = this.#workouts.sort(
        (a, b) => Number(a.id) - Number(b.id)
      );
      containerWorkouts
        .querySelectorAll('.workout')
        .forEach(work => work.remove());
      this._setLocalStorage();
      this._getLocalStorage();
    }

    if (sortBy === sortType) {
      this.#workouts = this.#workouts.sort(
        (a, b) => a.type.localeCompare(b.type) - b.type.localeCompare(a.type)
      );
      containerWorkouts
        .querySelectorAll('.workout')
        .forEach(work => work.remove());
      this._setLocalStorage();
      this._getLocalStorage();
    }

    if (sortBy === sortDistance) {
      this.#workouts = this.#workouts.sort((a, b) => a.distance - b.distance);
      containerWorkouts
        .querySelectorAll('.workout')
        .forEach(work => work.remove());
      this._setLocalStorage();

      this._getLocalStorage();
    }

    if (sortBy === sortDuration) {
      this.#workouts = this.#workouts.sort((a, b) => a.duration - b.duration);
      containerWorkouts
        .querySelectorAll('.workout')
        .forEach(work => work.remove());
      this._setLocalStorage();
      this._getLocalStorage();
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //handling clicks on maps
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    //empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);

    form.removeAttribute('data-id');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _updateUI(e) {
    e.preventDefault();
    if (!form.dataset.id) {
      this._newWorkout(e);
    } else {
      this._updateWorkout(e);
    }
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    //get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let workout;

    //if activity is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return setTimeout(alert('Inputs have to be positive numbers!'), 3000);
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // if activity is cycling, create cycling object
    if (type === 'cycling') {
      //check if data is valid

      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      ) {
        return setTimeout(alert('Inputs have to be positive numbers!'), 3000);
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //add the new object to the workout array
    this.#workouts.push(workout);
    // console.log(workout);

    //render workout on map as marker
    this._renderWorkoutMarker(workout);
    //Render workout on list
    this._renderWorkout(workout);
    //hide form + clear input fields
    this._hideForm();

    //set local storage to all workouts
    this._setLocalStorage();
  }

  _updateWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    //hide old workout
    const workoutEl = containerWorkouts.querySelector('.editing');

    //get workout object
    const workout = this.#workouts.find(work => work.id === form.dataset.id);
    //set properties of object
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let cadence, elevation;
    if (type === 'running') {
      cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return setTimeout(alert('Inputs have to be positive numbers!'), 3000);
      } else {
        workoutEl.remove();
      }
    }
    if (type === 'cycling') {
      elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      ) {
        return setTimeout(alert('Inputs have to be positive numbers!'), 3000);
      } else {
        workoutEl.remove();
      }
    }
    workout.type = type;
    workout.distance = distance;
    workout.duration = duration;
    if (workout.type === 'running') {
      Object.setPrototypeOf(workout, Running.prototype);
      workout.cadence = cadence;
      workout.calcPace();
    }
    if (workout.type === 'cycling') {
      Object.setPrototypeOf(workout, Cycling.prototype);
      workout.elevationGain = elevation;
      workout.calcSpeed();
    }
    workout.date = new Date(workout.date);
    workout._setDescription();
    this._renderWorkoutMarker(workout);

    // workoutEl.classList.add('hidden');

    //update rendition on list
    this._renderWorkout(workout);
    //hide form
    this._hideForm();
    //update local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    
    <h2 class="workout__title">${
      workout.description
    }  <button class="btn btn-edit btn-hide">Edit</button>  <button class="btn btn-delete btn-hide">Delete</button> 
    </h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;
    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;
    }
    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _editWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    if (workout.type === 'running') {
      inputCadence.value = workout.cadence;
    }
    if (workout.type === 'cycling') {
      inputElevation.value = workout.elevationGain;
    }
    //display form
    form.dataset.id = workout.id;
    // console.log(workout);
    form.classList.add('edit');
    workoutEl.classList.add('editing');
    this._showForm(workout);
  }

  _deleteWorkout(e) {
    const workout = this.#workouts.find(
      work => work.id === this.#currentWorkout
    );
    // const workoutEl = containerWorkouts.querySelector(
    //   `[data-id="${this.#currentWorkout}"]`
    // );
    // console.log(workoutEl);
    if (this.#workouts.length === 1) this.#workouts = [];
    else {
      this.#workouts = this.#workouts.splice([workout], 1);
    }
    // containerWorkouts.removeChild(workoutEl);
    this._setLocalStorage();
    modalInfo.textContent = '';
    this._closeModal();
    location.reload();
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    this.#currentWorkout = workoutEl.dataset.id;
    //button display
    const buttonsAll = containerWorkouts.querySelectorAll('.btn');
    buttonsAll.forEach(btn => btn.classList.add('btn-hide'));
    const button = workoutEl.querySelectorAll('.btn');
    button.forEach(btn => btn.classList.remove('btn-hide'));
    //edit button
    const editButton = workoutEl.querySelector('.btn-edit');
    editButton.addEventListener('click', this._editWorkout.bind(this));
    //delete button
    const deleteButton = workoutEl.querySelector('.btn-delete');
    deleteButton.addEventListener(
      'click',
      function () {
        modalType = 'delete';
        this._openModal();
      }.bind(this)
    );

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    if (workout) {
      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }

    //using the public interface
    // workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);
    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      if (work.type === 'running') {
        Object.setPrototypeOf(work, Running.prototype);
      }
      if (work.type === 'cycling') {
        Object.setPrototypeOf(work, Cycling.prototype);
      }
      this._renderWorkout(work);
    });
  }

  _openModal(e) {
    let spanElement;
    const spanEl = modal.querySelector('span');
    console.log(spanEl);
    const insertHTML = function (span) {
      if (spanEl) modalContent.removeChild(spanEl);

      modalContent.insertAdjacentHTML(
        modalType === 'location' ? 'afterbegin' : 'beforeend',
        span
      );
    };
    if (modalType === 'location') {
      spanElement = "<span class='close'>&times;</span>";
      insertHTML(spanElement);
      modalInfo.textContent =
        'This application will not work without Geo-Location. Pease turn location services on.';
      // close = modalContent.querySelector('.close');
      // close.addEventListener('click', this._closeModal.bind(this));
    }
    if (modalType === 'delete') {
      spanElement =
        "<span class='modal-buttons'><button class='confirm-delete'>Delete</button> &emsp;  <button class='close'>Cancel</button></span>";
      insertHTML(spanElement);
      modalInfo.textContent = 'Are you sure you want to delete this?';
      // close = modal.querySelector('.close');
      // close.addEventListener('click', this._closeModal.bind(this));
      let confirmDelete = modal.querySelector('.confirm-delete');
      confirmDelete.addEventListener('click', this._deleteWorkout.bind(this));
    }
    if (modalType === 'deleteAll') {
      spanElement =
        "<span class='modal-buttons'><button class='confirm-delete'>Delete</button> &emsp;  <button class='close'>Cancel</button></span>";
      modalInfo.textContent = 'Are you sure you want to delete all workouts?';
      insertHTML(spanElement);
      // close = modal.querySelector('.close');
      // close.addEventListener('click', this._closeModal.bind(this));
      let confirmDelete = modal.querySelector('.confirm-delete');
      confirmDelete.addEventListener('click', this.reset);
    }
    let close = modal.querySelector('.close');
    close.addEventListener('click', this._closeModal.bind(this));

    modal.style.display = 'block';
  }
  _closeModal(e) {
    modal.style.display = 'none';
    modalInfo.textContent = '';
  }

  reset() {
    localStorage.removeItem('workouts');
    modalInfo.textContent = '';

    location.reload();
  }
}

const app = new App();
