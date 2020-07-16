(function () {

    function extend(base, constructor) {
        var prototype = new Function();
        prototype.prototype = base.prototype;
        constructor.prototype = new prototype();
        constructor.prototype.constructor = constructor;
    }

    var LineSegment = function (x1, y1, x2, y2) {
        this.p1 = { x: x1, y: y1 };
        this.p2 = { x: x2, y: y2 };
    }

    LineSegment.prototype = {
        intersects: function (other) {
            var det, gamma, lambda;
            det = (this.p2.x - this.p1.x) * (other.p2.y - other.p1.y) - (other.p2.x - other.p1.x) * (this.p2.y - this.p1.y);
            if (det === 0) {
                return false;
            } else {
                lambda = ((other.p2.y - other.p1.y) * (other.p2.x - this.p1.x) + (other.p1.x - other.p2.x) * (other.p2.y - this.p1.y)) / det;
                gamma = ((this.p1.y - this.p2.y) * (other.p2.x - this.p1.x) + (this.p2.x - this.p1.x) * (other.p2.y - this.p1.y)) / det;
                return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
            }
        }
    }

    var Game = function (canvasId) {
        var canvas = document.getElementById(canvasId);
        this.screen = canvas.getContext('2d');
        this.screen.strokeStyle ="#FFFFFF";
        this.screen.fillStyle ="#FFFFFF";
        this.gameSize = { x: canvas.width, y: canvas.height };

        this.isGameOver = false;
        var self = this;

        var createSurface = function (landingPad, objs) {
            var step = canvas.width / 12;
            var ymax = canvas.height - 20;
            var ymin = canvas.height * 0.8;
            var y = ymin + Math.random() * (ymax - ymin);
            var surface = [];

            for (var x = 0; x < canvas.width; x += step) {
                var ynext = 0;
                var delta = canvas.height / 20;
                while (ynext < ymin || ynext > ymax) {

                    if (landingPad.x > x && landingPad.x < (x + step)) {
                        ynext = y;
                        landingPad.width = step - 4;
                        landingPad.y = y - 2;
                        landingPad.height = 3;
                        continue;
                    }
                    var r = Math.random();
                    if (r < 0.2) {
                        ynext = y + 3 * delta;
                    }
                    else if (r < 0.4) {
                        ynext = y + delta;
                    }
                    else if (r < 0.6) {
                        ynext = y - delta;
                    }
                    else if (r < 0.8) {
                        ynext = y + 3 * delta;
                    }
                    else {
                        ynext = y;
                    }
                }
                var segment = new SurfaceSegment(x, y, x + step, ynext);
                objs.push(segment);
                surface.push(segment);
                y = ynext;
            }
            return surface;
        };

        var printCentered = function (text, yOffset) {
            var metric = self.screen.measureText(text);
            self.screen.fillText(text, self.gameSize.x / 2 - metric.width / 2, self.gameSize.y / 2 - (metric.actualBoundingBoxDescent - metric.actualBoundingBoxAscent) * yOffset);
        }

        var tick = function () {
            self.update();
            if (self.isGameOver) {
                printCentered(self.gameOverMsgs[0], -0.8)
                if (self.gameOverMsgs.length > 1) {
                    printCentered(self.gameOverMsgs[1], 0.8)
                }

                window.setTimeout(() => {
                    printCentered("Press any key to play again", 5.6)
                    window.onkeydown = function (e) {
                        new Game("screen");
                    }
                }, 1500);
                return;
            }
            self.render(self.screen, self.gameSize);
            requestAnimationFrame(tick);
        }

        this.objs = [];

        this.boundingBox = new BoundingBox(0, 0, this.gameSize.x, this.gameSize.y);
        this.objs.push(this.boundingBox);
        this.landingPad = new LandingPad((2 + Math.round(Math.random() * 8)) * (this.gameSize.x / 12) + 2);
        this.objs.push(this.landingPad);
        this.surface = createSurface(this.landingPad, this.objs);
        this.ship = new Ship(this);
        this.objs.push(this.ship);
        this.fuelGauge = new FuelGauge(this, this.ship);
        this.objs.push(this.fuelGauge);

        this.init();
        tick();
    }

    Game.prototype = {
        init: function () {
            this.objs.forEach(obj => obj.init());
        },

        update: function () {
            this.objs.forEach(obj => obj.update());
        },

        render: function (screen, size) {
            screen.clearRect(0, 0, size.x, size.y);
            this.objs.forEach(obj => obj.render(screen));
        },

        outOfBounds: function (obj) {
            return this.boundingBox.intersects(obj);
        },

        touchingSurface: function (obj) {
            var touching = this.surface.filter((surfaceSegment) => {
                return surfaceSegment.intersects(obj);
            });
            return touching.length > 0;
        },

        touchingLandingPad: function (obj) {
            return this.landingPad.intersects(obj);
        },

        win: function () {
            this.isGameOver = true;
            this.gameOverMsgs = ["YOU WIN!"];
        },

        gameOver: function (msg) {
            this.isGameOver = true;
            this.gameOverMsgs = ["GAME OVER", msg];
        }
    }

    var GameObject = function () {
        this.lineSegments = [];
    }

    GameObject.prototype = {
        init: function () {
        },

        update: function () {
        },

        render: function (screen) {
            screen.beginPath();
            this.lineSegments.forEach((s) => {
                screen.moveTo(s.p1.x, s.p1.y);
                screen.lineTo(s.p2.x, s.p2.y);
            });
            screen.stroke();
        },

        intersects: function (other) {
            var retval = this.lineSegments.filter((l1) => {
                var retval = other.lineSegments.filter((l2) => {
                    var retval = l1.intersects(l2);
                    return retval;
                }).length > 0;
                return retval;
            }).length > 0;
            return retval;
        }
    }

    var BoundingBox = function (x, y, width, height) {
        this.lineSegments = [
            new LineSegment(x, y, x + width, y),
            new LineSegment(x + width, y, x + width, y + height),
            new LineSegment(x + width, y + height, x, y + height),
            new LineSegment(x, y + height, x, y)
        ];
    }

    extend(GameObject, BoundingBox);

    var SurfaceSegment = function (x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.lineSegments = [new LineSegment(x1, y1, x2, y2)];
    }

    extend(GameObject, SurfaceSegment);

    var LandingPad = function (x) {
        this.x = x;
        this.y = 0;
        this.width = 0;
        this.height = 0;
    }

    extend(GameObject, LandingPad);

    LandingPad.prototype.init = function () {
        this.lineSegments = [
            new LineSegment(this.x, this.y, this.x, this.y - this.height),
            new LineSegment(this.x, this.y - this.height, this.x + this.width, this.y - this.height),
            new LineSegment(this.x + this.width, this.y - this.height, this.x + this.width, this.y),
            new LineSegment(this.x + this.width, this.y, this.x, this.y)
        ];
    }

    var Ship = function (game) {
        this.game = game;
        
        this.maxFuel = 100;
        this.fuel = this.maxFuel;
        
        do {
            this.position = { x: game.gameSize.x * 0.2 + Math.random() * game.gameSize.x * 0.6, y: 30 };
        } while ((Math.abs(this.position.x - this.game.landingPad.x - this.game.landingPad.width / 2)) < 50);

        this.size = { width: 10, height: 10 };
        this.angle = 0;
        this.thrust = 0;
        this.gravity = 0.01;
        this.speed = { x: 0.0, y: 0.0 };
        this.Input = new Input();
    }

    extend(GameObject, Ship);

    Ship.prototype.update = function () {
        if (this.fuel > 0) {
            if (this.Input.isDown(this.Input.KEYS.LEFT)) {
                this.angle += Math.PI / 180 * 2;
            }
            if (this.Input.isDown(this.Input.KEYS.RIGHT)) {
                this.angle -= Math.PI / 180 * 2;
            }

            this.angle = Math.max(-Math.PI * 3 / 4, Math.min(Math.PI * 3 / 4, this.angle));

            if (this.Input.isDown(this.Input.KEYS.SPACE)) {
                this.thrust += 0.0021;
                this.thrust = Math.min(this.thrust, 0.05);
            }
            else {
                this.thrust = -0.0017;
                this.thrust = Math.max(this.thrust, 0);
            }
        }
        else {
            this.thrust = 0;
        }

        this.fuel = Math.max(0, this.fuel - this.thrust * 7);

        this.speed.x = this.speed.x - this.thrust * Math.sin(this.angle);
        this.speed.y = this.speed.y - this.thrust * Math.cos(this.angle);
        this.speed.y = this.speed.y + this.gravity;

        this.position.x = this.position.x + this.speed.x;
        this.position.y = this.position.y + this.speed.y;

        this._calculateLineSegments();

        if (this.game.touchingLandingPad(this)) {
            if (this.speed.y > 0.8) {
                this.game.gameOver("You came down too fast");
                return;
            }
            if (Math.abs(this.angle) > Math.PI / 180 * 8) {
                this.game.gameOver("Your landing angle was bad");
                return;
            }
            this.game.win();
        }
        if (this.game.outOfBounds(this)) {
            this.game.gameOver("You went off into space");
        }
        if (this.game.touchingSurface(this)) {
            if (this.fuel > 0) {
                this.game.gameOver("You crashed, causing a crater " + Math.round(this.fuel / 1.7) + " km wide.");
            }
            else {
                this.game.gameOver("You crashed.");
            }
        }
    };

    Ship.prototype._calculateLineSegments = function () {
        var x1 = this.position.x;
        var y1 = this.position.y;
        var x2 = x1 + 10 * Math.sin(-this.angle);
        var y2 = y1 - 10 * Math.cos(-this.angle);
        var x3 = x2 + 5 * Math.sin(-this.angle + Math.PI / 4);
        var y3 = y2 - 5 * Math.cos(-this.angle + Math.PI / 4);
        var x4 = x3 + 5 * Math.sin(-this.angle + Math.PI * 3 / 4);
        var y4 = y3 - 5 * Math.cos(-this.angle + Math.PI * 3 / 4);
        var x5 = x4 + 10 * Math.sin(-this.angle + Math.PI);
        var y5 = y4 - 10 * Math.cos(-this.angle + Math.PI);

        this.lineSegments = [
            new LineSegment(x1, y1, x2, y2),
            new LineSegment(x2, y2, x3, y3),
            new LineSegment(x3, y3, x4, y4),
            new LineSegment(x2, y2, x4, y4),
            new LineSegment(x4, y4, x5, y5),
            new LineSegment(x5, y5, x1, y1),
        ];

        if (this.thrust > 0) {
            var flareSize = this.thrust * 150;

            var x1 = this.position.x + 1 * Math.sin(this.angle + Math.PI / 4);
            var y1 = this.position.y + 1 * Math.cos(this.angle + Math.PI / 4);
            var x2 = x1 + 6 * Math.sin(this.angle + Math.PI / 2);
            var y2 = y1 + 6 * Math.cos(this.angle + Math.PI / 2);
            var x3 = x1 + 3 * Math.sin(this.angle + Math.PI / 2) - flareSize * Math.sin(this.angle + Math.PI);
            var y3 = y1 + 3 * Math.cos(this.angle + Math.PI / 2) - flareSize * Math.cos(this.angle + Math.PI);
            this.flareLineSegments = [
                new LineSegment(x1, y1, x2, y2),
                new LineSegment(x2, y2, x3, y3),
                new LineSegment(x3, y3, x1, y1)
            ];
        }
        else {
            this.flareLineSegments = [];
        }
    }

    Ship.prototype.render = function (screen) {
        screen.beginPath();
        this.lineSegments.concat(this.flareLineSegments).forEach((s) => {
            screen.moveTo(s.p1.x, s.p1.y);
            screen.lineTo(s.p2.x, s.p2.y);
        });
        screen.stroke();
    }

    var FuelGauge = function (game, ship) {
        this.ship = ship;
        this.label = "Fuel:";

        var metric = game.screen.measureText(this.label);

        var textHeight = metric.actualBoundingBoxAscent - metric.actualBoundingBoxDescent;
        this.textPosition = { x: 4, y: 4 + textHeight };
        this.textSize = {x: metric.width, y: textHeight};

        this.barPosition = {x: this.textPosition.x + this.textSize.x + 4, y: this.textPosition.y - textHeight};
        this.barSize = { x: game.gameSize.x / 4, y: textHeight};
        
        this.lineSegments = [
            new LineSegment(this.barPosition.x, this.barPosition.y, this.barPosition.x, this.barPosition.y + this.barSize.y),
            new LineSegment(this.barPosition.x, this.barPosition.y + this.barSize.y, this.barPosition.x + this.barSize.x, this.barPosition.y + this.barSize.y),
            new LineSegment(this.barPosition.x + this.barSize.x, this.barPosition.y + this.barSize.y, this.barPosition.x + this.barSize.x, this.barPosition.y),
            new LineSegment(this.barPosition.x + this.barSize.x, this.barPosition.y, this.barPosition.x, this.barPosition.y),
        ];
    }
    
    extend(GameObject, FuelGauge);
    
    FuelGauge.prototype.render = function (screen) {
        GameObject.prototype.render.call(this, screen);
        screen.fillText(this.label, this.textPosition.x, this.textPosition.y);
        screen.fillRect(this.barPosition.x, this.barPosition.y, this.barSize.x * (this.ship.fuel / this.ship.maxFuel), this.barSize.y);
    }

    var Input = function () {
        var keyState = {};

        window.onkeydown = function (e) {
            keyState[e.keyCode] = true;
        }
        window.onkeyup = function (e) {
            keyState[e.keyCode] = false;
        }

        this.isDown = function (keyCode) {
            return keyState[keyCode] === true;
        }

        this.KEYS = { LEFT: 37, RIGHT: 39, SPACE: 32 };
    }

    window.onload = function () {
        new Game("screen");
    }
})();
