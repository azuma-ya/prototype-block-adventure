"use Strict";
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let vcanvas = document.createElement("canvas");
let vctx = vcanvas.getContext("2d");

//画面サイズ
const SCREEN_W = 600;
const SCREEN_H = 400;

//フィールドサイズ
const FIELD_W = 2400;
const FIELD_H = 1600;

//フレームレート
const GAME_FPS = 120;

//キャンバスサイズの設定
vcanvas.width = FIELD_W;
vcanvas.height = FIELD_H;

canvas.width = SCREEN_W;
canvas.height = SCREEN_H;

//document.body.appendChild(vcanvas);

let camera_speed = 5;

let blocks = [];
let effects = [];
let key = [];

//カラークラス
class Color {
	constructor(red, blue, green, alpha) {
		this.ored = red;
		this.oblue = blue;
		this.ogreen = green;
		this.oalpha = alpha;
		this.red = red;
		this.blue = blue;
		this.green = green;
		this.alpha = alpha;
	}
	style() {
		return (
			"rgba(" +
			this.red +
			"," +
			this.green +
			"," +
			this.blue +
			"," +
			this.alpha +
			")"
		);
	}
}

//ベクトルクラス
class Vec2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	add(b) {
		//このベクトルと引数のベクトルの和を求める
		let a = this;
		return new Vec2(a.x + b.x, a.y + b.y);
	}
	sub(b) {
		//このベクトルと引数のベクトルの差を求める
		let a = this;
		return new Vec2(a.x - b.x, a.y - b.y);
	}
	mul(s) {
		//このベクトルを実数S倍したベクトルを求める
		let a = this;
		return new Vec2(s * a.x, s * a.y);
	}
	mag() {
		//このベクトルの大きさを求める
		let a = this;
		return Math.sqrt(a.x ** 2 + a.y ** 2);
	}
	norm() {
		//このベクトルを正規化したベクトルを求める
		let a = this;
		return a.mul(1 / a.mag());
	}
	dot(b) {
		//このベクトルと引数ベクトルのドット積(内積)を求める
		let a = this;
		return a.x * b.x + a.y * b.y;
	}
	change() {
		//このベクトルの成分を逆転する
		let a = this;
		return new Vec2(a.y, a.x);
	}
	reflect(material) {
		//反射ベクトルを求める
		let a = this;
		return new Vec2(a.x * reflect_e[material].x, a.y * -reflect_e[material].y);
	}
}

let mouse = new Vec2(SCREEN_W / 2, SCREEN_H / 2);

//マテリアルクラス
class Material {
	constructor(reflect, effects) {
		this.reflect = reflect;
		this.effects = effects;
	}
}

let materials = {
	norm: new Material(new Vec2(0.7, 0.8), 150),
	soil: new Material(new Vec2(0.2, 0.2), 30),
};

//重力クラス
class Gravity {
	constructor(way, vecs) {
		this.way = way;
		this.vecs = vecs;
	}
	vecway() {
		return this.vecs[this.way];
	}
}

let g = new Gravity("bottom", {
	top: new Vec2(0, -1000),
	bottom: new Vec2(0, 1000),
	left: new Vec2(-1000, 0),
	right: new Vec2(1000, 0),
});

//四角クラス
class Square {
	constructor(p, xsize, ysize, color) {
		this.p = p;
		this.xsize = xsize;
		this.ysize = ysize;
		this.color = color;
	}
	draw() {
		vctx.fillStyle = this.color.style();
		vctx.fillRect(
			this.p.x - this.xsize / 2,
			this.p.y - this.ysize / 2,
			this.xsize,
			this.ysize
		);
	}
}

//エフェクトクラス
class Effect extends Square {
	constructor(p, v, xsize, ysize, color, hp) {
		super(p, xsize, ysize, color);
		this.v = v;
		this.hp = hp;
		this.kill = false;
	}
	update() {
		this.hp--;
		this.v = this.v.add(g.vecway().mul(1 / GAME_FPS));
		this.p = this.p.add(this.v.mul(1 / GAME_FPS));
		if (this.hp < 0) this.kill = true;
	}
}

//ブロッククラス
class Block extends Square {
	constructor(p, xsize, ysize, color, material) {
		super(p, xsize, ysize, color);
		this.material = material;
		this.nameis = "normblock";
	}
	update() {}
}

blocks.push(
	new Block(
		new Vec2(FIELD_W / 2, FIELD_H - SCREEN_H / 2 - SCREEN_H / 4),
		FIELD_W,
		SCREEN_H / 2,
		new Color(0, 0, 0, 1),
		"soil"
	)
);
blocks.push(
	new Block(
		new Vec2(FIELD_W / 2, SCREEN_H / 2 - SCREEN_H / 4),
		FIELD_W,
		SCREEN_H / 2,
		new Color(0, 0, 0, 1),
		"soil"
	)
);
blocks.push(
	new Block(
		new Vec2(SCREEN_W / 2 - SCREEN_W / 4, FIELD_H / 2),
		SCREEN_W / 2,
		FIELD_H,
		new Color(0, 0, 0, 1),
		"soil"
	)
);
blocks.push(
	new Block(
		new Vec2(FIELD_W - SCREEN_W / 2 + SCREEN_W / 4, FIELD_H / 2),
		SCREEN_W / 2,
		FIELD_H,
		new Color(0, 0, 0, 1),
		"soil"
	)
);
blocks.push(
	new Block(new Vec2(800, 600), 200, 50, new Color(0, 0, 0, 1), "soil")
);
blocks.push(
	new Block(new Vec2(700, 1150), 100, 100, new Color(0, 0, 0, 1), "soil")
);

//重力ブロック
class GravityBlock extends Square {
	constructor(p, v, xsize, ysize, color, material) {
		super(p, xsize, ysize, color);
		this.v = v;
		this.air = false;
		this.material = material;
		this.nameis = "gravityblock";
	}
	update() {
		this.v = this.v.add(g.vecway().mul(1 / GAME_FPS));
		this.p = this.p.add(this.v.mul(1 / GAME_FPS));

		for (let block of blocks) {
			//ブロックとの当たり判定と処理
			if (block != this) reflect(block, this);
		}
		reflect(player, this);

		if (this.p.x < SCREEN_W / 2) this.p.x = SCREEN_W / 2;
		if (this.p.y < SCREEN_H / 2) this.p.y = SCREEN_H / 2;
		if (this.p.x > FIELD_W - SCREEN_W / 2) this.p.x = FIELD_W - SCREEN_W / 2;
		if (this.p.y > FIELD_H - SCREEN_H / 2) this.p.y = FIELD_H - SCREEN_H / 2;
	}
}

blocks.push(
	new GravityBlock(
		new Vec2(500, 600),
		new Vec2(0, -300),
		50,
		50,
		new Color(0, 0, 0, 1),
		"soil"
	)
);

//移動ブロッククラス
class MoveBlock extends Square {
	constructor(p, xsize, ysize, color, way, material) {
		super(p, xsize, ysize, color);
		this.center = p;
		this.way = way;
		this.v = new Vec2(0, 0);
		this.angle = 0;
		this.material = material;
		this.nameis = "moveblock";
	}
	update() {
		this.angle++;
		this.v = new Vec2(Math.cos((Math.PI / 180) * this.angle), 0).mul(300);
		if (this.way == "up") this.v = this.v.change();

		this.p = this.p.add(this.v.mul(1 / GAME_FPS));
	}
}

//blocks.push(new MoveBlock(new Vec2(600,1000),50,50,new Color(0,0,0,1),"side","soil"));

// //ブロッククラス
// class Block extends Square
// {
// 	constructor(p,xsize,ysize,color,material){
// 		super(p,xsize,ysize,color);
// 		this.material = material;
// 		this.nameis = "normblock";
// 	}
// 	update(){
// 	}
// }

//カメラクラス
class Camera extends Square {
	constructor(p, xsize, ysize, color) {
		super(p, xsize, ysize, color);
		this.v = new Vec2(0, 0);
	}
	update() {
		let d_alpha = 0.005;
		this.color.alpha - d_alpha > 0
			? (this.color.alpha -= d_alpha)
			: (this.color.alpha = 0);

		this.v = player.p.sub(this.p).mul(camera_speed);
		this.p = this.p.add(this.v.mul(1 / GAME_FPS));
	}
}

let camera = new Camera(
	new Vec2(SCREEN_W / 2, SCREEN_H / 2),
	SCREEN_W,
	SCREEN_H,
	new Color(0, 0, 0, 1)
);

//プレイヤークラス
class Player extends Square {
	constructor(p, v, xsize, ysize, color, material) {
		super(p, xsize, ysize, color);
		this.v = v;
		this.air = false;
		this.material = material;
	}
	update() {
		this.v = this.v.add(g.vecway().mul(1 / GAME_FPS));
		this.p = this.p.add(this.v.mul(1 / GAME_FPS));
		for (let block of blocks) {
			//ブロックとの当たり判定と処理
			reflect(block, this);
		}
		// if(this.p.x < SCREEN_W/2)this.p.x = SCREEN_W/2;
		// if(this.p.y < SCREEN_H/2)this.p.y = SCREEN_H/2;
		if (this.p.x > FIELD_W - SCREEN_W / 2) this.p.x = FIELD_W - SCREEN_W / 2;
		if (this.p.y > FIELD_H - SCREEN_H / 2) this.p.y = FIELD_H - SCREEN_H / 2;
	}
}

let player = new Player(
	new Vec2(400, 600),
	new Vec2(0, -300),
	50,
	50,
	new Color(0, 0, 0, 1),
	"norm"
);

setInterval(gameloop, 1000 / GAME_FPS);

function gameloop() {
	vctx.fillStyle = "#eee";
	vctx.globalAlpha = 1;
	vctx.fillRect(0, 0, FIELD_W, FIELD_H);

	for (let block of blocks) {
		block.update();
		if (
			checkHit(
				block.p.x,
				block.p.y,
				block.xsize,
				block.ysize,
				camera.p.x,
				camera.p.y,
				camera.xsize,
				camera.ysize
			)
		) {
			block.draw();
		}
	}
	player.update();
	player.draw();
	for (let effect of effects) {
		effect.update();
		if (effect.kill) effects.splice(effects.indexOf(effect), 1);
		else effect.draw();
	}
	camera.update();
	camera.draw();

	//ctx.clearRect(0,0,FIELD_W,FIELD_H);
	ctx.drawImage(
		vcanvas,
		camera.p.x - SCREEN_W / 2,
		camera.p.y - SCREEN_H / 2,
		SCREEN_W,
		SCREEN_H,
		0,
		0,
		SCREEN_W,
		SCREEN_H
	);
}

function rand(min, max) {
	//ランダム
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randEffect(p, aspect, color, size, hp) {
	let v;
	switch (aspect) {
		case "top": //
			v = new Vec2(rand(-200, 200), rand(-200, -100));
			effects.push(new Effect(p, v, size, size, color, hp));
			break;
		case "bottom": //
			v = new Vec2(rand(-200, 200), rand(100, 200));
			effects.push(new Effect(p, v, size, size, color, hp));
			break;
		case "left": //
			v = new Vec2(rand(100, 200), rand(-200, 200));
			effects.push(new Effect(p, v, size, size, color, hp));
			break;
		case "right": //
			v = new Vec2(rand(-200, -100), rand(-200, 200));
			effects.push(new Effect(p, v, size, size, color, hp));
			break;
	}
}

function pushEffects(p, asupect, color, size, hp, amounts) {
	for (let i = 0; i < amounts; i++) {
		randEffect(p, asupect, color, size, hp);
	}
}

function checkHit(x1, y1, sx1, sy1, x2, y2, sx2, sy2) {
	//当たり判定
	let left1 = x1 - sx1 / 2;
	let right1 = x1 + sx1 / 2;
	let top1 = y1 - sy1 / 2;
	let bottom1 = y1 + sy1 / 2;

	let left2 = x2 - sx2 / 2;
	let right2 = x2 + sx2 / 2;
	let top2 = y2 - sy2 / 2;
	let bottom2 = y2 + sy2 / 2;

	return (
		left1 <= right2 && right1 >= left2 && top1 <= bottom2 && bottom1 >= top2
	);
}

function reflect(object, mine) {
	if (
		checkHit(
			object.p.x,
			object.p.y,
			object.xsize - 1,
			object.ysize - 1,
			mine.p.x,
			mine.p.y,
			mine.xsize,
			mine.ysize
		)
	) {
		mine.air = false;
		if (
			checkHit(
				object.p.x,
				object.p.y - object.ysize / 2,
				object.xsize,
				1, //top
				mine.p.x,
				mine.p.y,
				mine.xsize,
				mine.ysize
			)
		) {
			mine.v.x = mine.v.x * materials[object.material].reflect.x;
			mine.v.y = mine.v.y * -materials[object.material].reflect.y;

			mine.p = mine.p.add(mine.v.mul(1 / GAME_FPS));

			if (Math.abs(mine.v.y) > materials[object.material].effects) {
				pushEffects(
					new Vec2(mine.p.x, mine.p.y + mine.ysize / 2),
					"top",
					new Color(0, 0, 0, 1),
					rand(5, 10),
					rand(60, 90),
					20
				);
			}
		}
		if (
			checkHit(
				object.p.x,
				object.p.y + object.ysize / 2,
				object.xsize,
				1, //bottom
				mine.p.x,
				mine.p.y,
				mine.xsize,
				mine.ysize
			)
		) {
			mine.v.x = mine.v.x * materials[object.material].reflect.x;
			mine.v.y = mine.v.y * -materials[object.material].reflect.y;

			mine.p = mine.p.add(mine.v.mul(1 / GAME_FPS));

			if (Math.abs(mine.v.y) > materials[object.material].effects) {
				pushEffects(
					new Vec2(mine.p.x, mine.p.y - mine.ysize / 2),
					"bottom",
					new Color(0, 0, 0, 1),
					rand(5, 10),
					rand(60, 90),
					20
				);
			}
		}
		if (
			checkHit(
				object.p.x - object.xsize / 2,
				object.p.y,
				1,
				object.ysize, //left
				mine.p.x,
				mine.p.y,
				mine.xsize,
				mine.ysize
			)
		) {
			mine.v.x = mine.v.x * -materials[object.material].reflect.x;
			mine.v.y = mine.v.y * materials[object.material].reflect.y;

			mine.p = mine.p.add(mine.v.mul(1 / GAME_FPS));

			if (Math.abs(mine.v.x) > materials[object.material].effects) {
				pushEffects(
					new Vec2(mine.p.x - mine.xsize / 2, mine.p.y),
					"left",
					new Color(0, 0, 0, 1),
					rand(5, 10),
					rand(60, 90),
					20
				);
			}
		}
		if (
			checkHit(
				object.p.x + object.xsize / 2,
				object.p.y,
				1,
				object.ysize, //right
				mine.p.x,
				mine.p.y,
				mine.xsize,
				mine.ysize
			)
		) {
			mine.v.x = mine.v.x * -materials[object.material].reflect.x;
			mine.v.y = mine.v.y * materials[object.material].reflect.y;

			mine.p = mine.p.add(mine.v.mul(1 / GAME_FPS));

			if (Math.abs(mine.v.x) > materials[object.material].effects) {
				pushEffects(
					new Vec2(mine.p.x + mine.xsize / 2, mine.p.y),
					"right",
					new Color(0, 0, 0, 1),
					rand(5, 10),
					rand(60, 90),
					20
				);
			}
		}
		while (
			checkHit(
				object.p.x,
				object.p.y,
				object.xsize - 1,
				object.ysize - 1,
				mine.p.x,
				mine.p.y,
				mine.xsize,
				mine.ysize
			)
		) {
			mine.p = mine.p.add(mine.v.mul(1 / GAME_FPS));
		}
	}
}

document.onkeydown = function (e) {
	switch (e.keyCode) {
		case 37: //左
			g.way = "left";
			camera.p.x -= 5;
			break;
		case 38: //上
			g.way = "top";
			break;
		case 39: //右
			g.way = "right";
			break;
		case 40: //下
			g.way = "bottom";
			break;
	}

	key[e.keyCode] = true;
};

document.onkeyup = function (e) {
	key[e.keyCode] = false;
};

document.onmousedown = function (e) {
	mouse.x = e.clientX - 10;
	mouse.y = e.clientY - 10;
	let screen_camera = new Vec2(
		camera.p.x - SCREEN_W / 2,
		camera.p.y - SCREEN_H / 2
	);

	if (player.air == false) {
		player.v = player.v.add(
			mouse.sub(player.p.sub(screen_camera)).norm().mul(600)
		);
		player.air = true;
	}
};

document.onmousemove = function (e) {
	mouse.x = e.clientX - 10;
	mouse.y = e.clientY - 10;
};
