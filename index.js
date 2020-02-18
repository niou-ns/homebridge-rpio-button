const rpio = require('rpio');
let Service, Characteristic;

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-rpio-button", "RpioButton", RpioButton);
};

function RpioButton(log, config) {
    this.log = log;
    this.name = config.name ? config.name : 'Rpio Button';
    this.pin = config.pin ? config.pin : 15; // GPIO 22
    this.state = false;
    this.preventTurnOff = config.preventTurnOff ? config.preventTurnOff : false;
    this.timeout = config.timeout ? config.timeout : 500;
    this.type = config.type ? config.type : false;
    this.services = [];

    rpio.open(this.pin, rpio.OUTPUT);
    this.log(`Created button: ${this.name} on pin: ${this.pin}`);

    if (this.type == 'lock') {
        this.state = Characteristic.LockCurrentState.SECURED;
        this.service = new Service.LockMechanism(this.name);
        this.service.getCharacteristic(Characteristic.LockCurrentState)
            .on('get', this.getLockCurrentState.bind(this));
        this.service.getCharacteristic(Characteristic.LockTargetState)
            .on('get', this.getLockTargetState.bind(this))
            .on('set', this.setLockTargetState.bind(this));
    } else {
        this.service = new Service.Switch(this.name);
        this.service.getCharacteristic(Characteristic.On)
            .on('get', this.getOn.bind(this))
            .on('set', this.setOn.bind(this));
    }

    this.serviceInfo = new Service.AccessoryInformation();
    this.serviceInfo
        .setCharacteristic(Characteristic.Manufacturer, 'Raspberry');


    this.services.push(this.service);
    this.services.push(this.serviceInfo);
}


RpioButton.prototype = {
    getOn: function(callback) {
        this.log.debug(`Button PIN: ${this.pin} is ${this.state ? 'HIGH' : 'LOW'}`);
        callback(null, this.state);
    },
    setOn: function(state, callback) {
        this.log.debug(`Set button PIN: ${this.pin} to ${state ? 'HIGH' : 'LOW'}`);
        this.state = state;
        rpio.write(this.pin, state ? rpio.HIGH : rpio.LOW);
        if (state && !this.preventTurnOff) {
            setTimeout(() => {
                rpio.write(this.pin, rpio.LOW);
                this.service.setCharacteristic(Characteristic.On, false);
            }, this.timeout);
        }
        callback(null);
    },
    getLockCurrentState: function(callback) {
        this.log.debug(`Button PIN: ${this.pin} is ${this.state === Characteristic.LockTargetState.SECURED ? 'HIGH' : 'LOW'}`);
        callback(null, this.state);
    },
    getLockTargetState: function(callback) {
        this.log.debug(`Button PIN: ${this.pin} target state ${this.state === Characteristic.LockTargetState.SECURED ? 'HIGH' : 'LOW'}`);
        callback(null, this.state);
    },
    setLockTargetState: function(state, callback) {
        this.log.debug(`Set button PIN: ${this.pin} to ${state === Characteristic.LockTargetState.SECURED ? 'HIGH' : 'LOW'}`);
        this.state = state;
        rpio.write(this.pin, state === Characteristic.LockTargetState.UNSECURED ? rpio.HIGH : rpio.LOW);
        if (state === Characteristic.LockTargetState.UNSECURED && !this.preventTurnOff) {
            setTimeout(() => {
                rpio.write(this.pin, rpio.LOW);
                this.service.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED);
            }, this.timeout);
        }
        callback(null);
    },
    getServices: function() {
        return this.services
    }
};
