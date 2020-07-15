; (function () {
    var lineSegment = function (x1, y1, x2, y2) {
        return { 
            p1: {x: x1, y: y1}, 
            p2: {x: x2, y: y2}
        };
    };

    var Game = function (canvasId) {
        var canvas = document.getElementById(canvasId);
        var screen = canvas.getContext('2d');
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

        var tick = function () {
            self.update();
            if (self.isGameOver) {
                var metric = screen.measureText(self.gameOverMsgs[0]);
                screen.fillText(self.gameOverMsgs[0], self.gameSize.x / 2 - metric.width / 2, self.gameSize.y / 2 + (metric.actualBoundingBoxDescent - metric.actualBoundingBoxAscent) * 0.8);
                if (self.gameOverMsgs.length > 1) {
                    var metric = screen.measureText(self.gameOverMsgs[1]);
                    screen.fillText(self.gameOverMsgs[1], self.gameSize.x / 2 - metric.width / 2, self.gameSize.y / 2 - (metric.actualBoundingBoxDescent - metric.actualBoundingBoxAscent) * 0.8);
                }

                var metric = screen.measureText("Press any key to play again");
                screen.fillText("Press any key to play again", self.gameSize.x / 2 - metric.width / 2, self.gameSize.y / 2 - (metric.actualBoundingBoxDescent - metric.actualBoundingBoxAscent) * 5.6);

                window.onkeydown = function (e) {
                    new Game("screen");
                }

                return;
            }
            self.draw(screen, self.gameSize);
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

        this.init();
        tick();
    };

    // returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
    function intersects(l1, l2) {
        var det, gamma, lambda;
        det = (l1.p2.x - l1.p1.x) * (l2.p2.y - l2.p1.y) - (l2.p2.x - l2.p1.x) * (l1.p2.y - l1.p1.y);
        if (det === 0) {
            return false;
        } else {
            lambda = ((l2.p2.y - l2.p1.y) * (l2.p2.x - l1.p1.x) + (l2.p1.x - l2.p2.x) * (l2.p2.y - l1.p1.y)) / det;
            gamma = ((l1.p1.y - l1.p2.y) * (l2.p2.x - l1.p1.x) + (l1.p2.x - l1.p1.x) * (l2.p2.y - l1.p1.y)) / det;
            return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
        }
    };

    function objectsIntersect(o1, o2) {
        var retval = o1.lineSegments.filter((l1) => {
            var retval = o2.lineSegments.filter((l2) => {
                var retval = intersects(l1, l2);
                return retval;
            }).length > 0;
            return retval;
        }).length > 0;
        return retval;
    };

    Game.prototype = {
        init: function () {
            this.objs.forEach(obj => obj.init());
        },

        update: function () {
            this.objs.forEach(obj => obj.update());
        },

        draw: function (screen, size) {
            screen.clearRect(0, 0, size.x, size.y);
            screen.beginPath();
            screen.moveTo(0, 0);
            screen.lineTo(0, size.y);
            screen.lineTo(size.x, size.y);
            screen.lineTo(size.x, 0);
            screen.closePath();
            screen.stroke();
            screen.fillText("Thrust: " + Math.round(10000 * this.ship.thrust), 10, 10);
            screen.fillText("Angle: " + Math.round(this.ship.angle / Math.PI * 180), 10, 20);
            screen.fillText("Vertical speed: " + Math.round(this.ship.speed.y*100), 10, 30);
            screen.fillText("Fuel: " + Math.round(this.ship.fuel), 10, 40);
            this.objs.forEach(obj => obj.draw(screen));
        },

        outOfBounds: function (obj) {
            return objectsIntersect(obj, this.boundingBox);
        },


        touchingSurface: function (obj) {
            var touching = this.surface.filter((surfaceSegment) => {
                return objectsIntersect(obj, surfaceSegment);
            });
            return touching.length > 0;

        },

        touchingLandingPad: function (obj) {
            return objectsIntersect(obj, this.landingPad);
        },

        win: function () {
            this.isGameOver = true;
            this.gameOverMsgs = ["YOU WIN!"];
        },

        gameOver: function (msg) {
            this.isGameOver = true;
            this.gameOverMsgs = ["GAME OVER", msg];
        }
    };

    var BoundingBox = function(x, y, width, height)
    {
        this.lineSegments = [
            lineSegment(x, y, x + width, y),
            lineSegment(x + width, y, x + width, y + height),
            lineSegment(x + width, y + height, x, y + height),
            lineSegment(x, y + height, x, y)
        ];
    }

    BoundingBox.prototype = 
    {
        init: function() {
        },

        update: function () {
        },

        draw: function(screen) {
            screen.beginPath();
            this.lineSegments.forEach((s) => {
                screen.moveTo(s.p1.x, s.p1.y);
                screen.lineTo(s.p2.x, s.p2.y);
            });
            screen.stroke();
        }

    };

    var SurfaceSegment = function (x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.lineSegments = [lineSegment(x1, y1, x2, y2)];
    }

    SurfaceSegment.prototype =
    {
        init: function() {
        },

        update: function () {
        },

        draw: function (screen) {
            screen.beginPath();
            screen.moveTo(this.x1, this.y1);
            screen.lineTo(this.x2, this.y2);
            screen.stroke();
        }
    }

    var LandingPad = function (x) {
        this.x = x;
        this.y = 0;
        this.width = 0;
        this.height = 0;
    }

    LandingPad.prototype =
    {
        init: function() {
            this.lineSegments = [
                lineSegment(this.x, this.y, this.x, this.y - this.height),
                lineSegment(this.x, this.y - this.height, this.x + this.width, this.y - this.height),
                lineSegment(this.x + this.width, this.y - this.height, this.x + this.width, this.y),
                lineSegment(this.x + this.width, this.y, this.x, this.y)
            ];
        },
        
        update: function () {
        },

        draw: function (screen) {
            screen.beginPath();
            this.lineSegments.forEach((s) => {
                screen.moveTo(s.p1.x, s.p1.y);
                screen.lineTo(s.p2.x, s.p2.y);
            });
            screen.stroke();
        }
    }

    var Ship = function (game) {
        this.game = game;
        this.fuel = 100;
        do {
            this.position = { x: game.gameSize.x * 0.2 + Math.random() * game.gameSize.x * 0.6, y: 25 };
        } while ((Math.abs(this.position.x - this.game.landingPad.x - this.game.landingPad.width / 2)) < 50);

        this.size = { width: 10, height: 10 };
        this.angle = 0;
        this.thrust = 0;
        this.speed = { x: 0.0, y: 0.01 };
        this.Input = new Input();
    }



    Ship.prototype =
    {
        init: function () {
        },

        update: function () {
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
            this.speed.y = this.speed.y + 0.005;

            this.position.x = this.position.x + this.speed.x;
            this.position.y = this.position.y + this.speed.y;

            this._calculateLineSegments();

            if (this.game.touchingLandingPad(this)) {
                if (this.speed.y > 0.8)
                {
                    this.game.gameOver("You came down too fast");
                    return;
                }
                if (Math.abs(this.angle) > Math.PI / 180 * 8)
                {
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
        },

        _calculateLineSegments: function () {
            var x1 = this.position.x;
            var y1 = this.position.y;
            var x2 = x1 + 10 * Math.sin(-this.angle);
            var y2 = y1 - 10 * Math.cos(-this.angle);
            var x3 = x2 + 10 * Math.sin(-this.angle + Math.PI / 8);
            var y3 = y2 - 10 * Math.cos(-this.angle + Math.PI / 8);
            var x4 = x3 + 10 * Math.sin(-this.angle + Math.PI * 7 / 8);
            var y4 = y3 - 10 * Math.cos(-this.angle + Math.PI * 7 / 8);
            var x5 = x4 + 10 * Math.sin(-this.angle + Math.PI);
            var y5 = y4 - 10 * Math.cos(-this.angle + Math.PI);

            this.lineSegments = [
                lineSegment(x1, y1, x2, y2),
                lineSegment(x2, y2, x3, y3),
                lineSegment(x3, y3, x4, y4),
                lineSegment(x2, y2, x4, y4),
                lineSegment(x4, y4, x5, y5),
                lineSegment(x5, y5, x1, y1),
            ];

            if (this.thrust > 0) {
                var flareSize = this.thrust * 100;

                var x1 = this.position.x + 1 * Math.sin(this.angle + Math.PI / 4);
                var y1 = this.position.y + 1 * Math.cos(this.angle + Math.PI / 4);
                var x2 = x1 + 6 * Math.sin(this.angle + Math.PI / 2);
                var y2 = y1 + 6 * Math.cos(this.angle + Math.PI / 2);
                var x3 = x1 + 3 * Math.sin(this.angle + Math.PI / 2) - flareSize * Math.sin(this.angle + Math.PI);
                var y3 = y1 + 3 * Math.cos(this.angle + Math.PI / 2) - flareSize * Math.cos(this.angle + Math.PI);
                this.flareLineSegments = [
                        lineSegment(x1, y1, x2, y2),
                        lineSegment(x2, y2, x3, y3),
                        lineSegment(x3, y3, x1, y1)
                ];
            }
            else {
                this.flareLineSegments = [];
            }
        },

        draw: function (screen) {
            screen.beginPath();
            this.lineSegments.concat(this.flareLineSegments).forEach((s) => {
                screen.moveTo(s.p1.x, s.p1.y);
                screen.lineTo(s.p2.x, s.p2.y);
            });
            screen.stroke();
        }
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
};

window.onload = function () {
    new Game("screen");
}
}) ();
