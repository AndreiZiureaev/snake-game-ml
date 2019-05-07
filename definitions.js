'use strict';

function colorToText(col) {
    return `rgb(${col.r},${col.g},${col.b})`;
}

// Game
const PIXELS_PER_CELL = 30;

const BACKGROUND_COLOR_OBJECT = { r: 0, g: 0, b: 0 };
const BACKGROUND_COLOR = colorToText(BACKGROUND_COLOR_OBJECT);

const TEXT_COLOR_OBJECT = { r: 239, g: 239, b: 239 };
const TEXT_COLOR = colorToText(TEXT_COLOR_OBJECT);

const PAUSED_FONT_SIZE = 15;
const PAUSED_FONT = `bold ${PAUSED_FONT_SIZE}px sans-serif`;
const PAUSED_FONT_ALIGN = 'center';
const PAUSED_FONT_BASELINE = 'middle';

const PAUSED_TEXT = 'Click to resume/pause';
const FPS_TEXT = 'FPS: ';
const TPS_TEXT = 'TPS: ';
const AI_ON_TEXT = 'AI: on';
const AI_OFF_TEXT = 'AI: off';
const AI_OFF_COLOR = '#ff2020';

const INFO_FONT_SIZE = 11;
const INFO_FONT = `${INFO_FONT_SIZE}px sans-serif`;
const INFO_FONT_MARGIN = 2;
const INFO_FONT_ALIGN = 'left';
const INFO_FONT_BASELINE = 'top';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const tpsSlider = document.getElementById('tps');
const tpsSpan = document.getElementById('tpsSpan');
const fpsSlider = document.getElementById('fps');
const fpsSpan = document.getElementById('fpsSpan');
const generationSpan = document.getElementById('generation');
const highestSpan = document.getElementById('highest');
const aiSpan = document.getElementById('aiSpan');

const snakesInput = document.getElementById('snakes');
const resetButton = document.getElementById('reset');

const inputJSON = document.getElementById('inputJSON');
const sampleJSONButton = document.getElementById('sampleJSON');
const bestJSONButton = document.getElementById('bestJSON');
const loadJSONButton = document.getElementById('loadJSON');

const widthPx = canvas.width;
const heightPx = canvas.height;
const centerPxX = Math.floor(widthPx / 2);
const centerPxY = Math.floor(heightPx / 2);

const widthCells = Math.floor(widthPx / PIXELS_PER_CELL);
const heightCells = Math.floor(heightPx / PIXELS_PER_CELL);
const centerCellX = Math.floor(widthCells / 2);
const centerCellY = Math.floor(heightCells / 2);
const totalCellsMinusOne = widthCells * heightCells - 1;
const maxDist = Math.max(widthCells, heightCells);
const widthCellsMinusOne = widthCells - 1;
const heightCellsMinusOne = heightCells - 1;

let snakesPerGeneration = 1;
let frameTimestamp = 0;
let tickTimestamp = 0;
let actualTPS = 0;
let frameID = 0;
let tickID = 0;
let generation = 1;
let highestScore = 0;
let bestSnake;
let AI = true;
let timePerTick;
let timePerFrame;

const buffer = [];

let allSnakes = [];
const activeSnakes = function* () {
    for (let snake of allSnakes) {
        if (snake.isActive) {
            yield snake;
        }
    }
};

// Snake
const TWOPI = Math.PI * 2;

const UP = [0, -1];
const UP_RIGHT = [1, -1];
const RIGHT = [1, 0];
const RIGHT_DOWN = [1, 1];
const DOWN = [0, 1];
const DOWN_LEFT = [-1, 1];
const LEFT = [-1, 0];
const LEFT_UP = [-1, -1];

const SIMPLE = true;
const VISION_RAY_LENGTH = 3;

const HEAD_COLOR = { r: 10, g: 255, b: 10 };
const TAIL_COLOR = { r: 10, g: 255, b: 150 };
const EDIBLE_COLOR = { r: 255, g: 10, b: 150 };

const DRAW_MARGIN = Math.floor(PIXELS_PER_CELL * 0.1);
const CELL_SIZE = PIXELS_PER_CELL - DRAW_MARGIN * 2;

const edibleIncrement = widthCells + heightCells;

const SAMPLE_JSON = '{"input_nodes":12,"hidden_nodes":12,"output_nodes":4,"weights_ih":{"rows":12,"cols":12,"data":[[0.6229919259682899,-0.7258617733422089,1.4572266597177383,7.825235091240427,-4.249086194155146,7.528662340673952,1.9220013966744551,1.2612620115775353,-1.4518733183395325,1.1549216564453877,-0.6700711703918723,-4.238166382513607],[0.8318276170731035,-2.5026169518999133,-0.8730428543711719,5.743927030154416,-4.8225887176492455,-0.07594832914166982,-7.574291993060549,-1.2617366963544698,3.6051926928096165,5.298043415939483,0.46102420510133885,1.8552293826083697],[1.3095255279729925,3.1666041743465385,3.2293512611011996,-2.3535717677479457,-6.006532692751213,1.1418945540089074,1.6092639112942826,0.9538616531707527,-2.724694007518042,-0.749682207130429,10.013618437985382,1.479948200469035],[-2.230042788014221,1.0917672222024337,-3.059725247080174,0.5071628336203928,-3.688450455407434,-2.8026855210130313,0.5781730780604124,-0.7795377963206985,-7.855716963933089,-2.584897833952206,2.4910603259219135,-3.6432855858650486],[0.8452177396652092,1.005296988885056,4.693523760575348,-3.670602155445655,-0.01832963689833758,0.6132720544280645,1.293049936347698,4.67087483669517,-5.508131480285941,-8.432373649284566,2.101531956355935,-1.005180818804756],[0.5751459791802022,0.4020437045134212,-1.5720133178861644,-5.898376694294233,-3.457841002055021,1.4722071888433126,4.1792676440055665,-6.651733035688429,2.5532058493592618,2.4653851374443247,8.547112017781433,-7.261060697453354],[-2.909398944404247,-3.5030270968307375,-1.791343424505644,1.6770578889055627,-1.1950755623690934,-2.698661811771201,2.8756213064783473,0.5592588852099593,3.487299836325481,2.5154414186961396,3.3214397395224187,-4.824108051676969],[4.735650677120525,0.09095713030658263,-0.11225894735304895,-9.132902674874572,0.483058197831191,-0.2820011548025126,4.439034198484485,-3.28795326331017,-3.6855626302039255,-1.5896348046433222,0.3146091583382643,0.22737648766786905],[0.35640893930534,-0.5467994319315346,2.2317744884701023,3.9825112333544648,0.8760058206801546,1.796803256673638,-2.5302145023965257,-4.113230172938633,2.6919586173550463,1.509291689398901,-0.12137953490573894,-3.810166546300943],[-2.0242962923688,-2.0376968791111523,4.352675188715446,-3.7085210859565296,-2.6878603035110964,-2.4612726053992144,-0.03394134221646805,-1.459925121752737,0.7525633289258395,3.779822726650451,2.1555193598332423,2.0558916238108265],[-2.298858392281186,-1.7706916465951161,0.32053653424367035,1.7437276047074322,-0.9348751897572629,-5.691288330776734,-5.685147592822714,4.572205894123732,-0.022638930636521004,-1.2920533236667673,-0.09712762490990426,2.6192245469561315],[-3.2481599286737755,0.5074784793321262,2.533780272644249,-7.919312249381004,-0.27223172234727483,6.600921464466688,-2.295074381326769,-4.890326259106121,3.9600300710393306,-0.19864861385056887,0.885225040690224,-0.3933085389209351]]},"weights_ho":{"rows":4,"cols":12,"data":[[-2.889310495305565,5.459975086548096,1.1374303497983707,-2.8051090044859164,4.266209471153341,0.028061653534205817,1.2069371080337048,-7.2310278443021,5.6201813172446675,-1.3586939404099967,1.7499006312450487,-5.929041302127079],[-4.272685962595493,3.6848740989694315,-3.184871205341051,2.4389105335602324,-6.9857212077715065,2.340276397183969,-0.21727721582022874,0.9335131273851855,4.843829359203007,0.7662411229881325,-1.6828794728533614,2.1738020422318134],[-3.31156679560703,-1.6750855055716214,3.507955256532128,-1.729275836156519,2.8777992354542374,-1.5965779941852416,-2.198337318654752,1.4076753442794825,-0.8641464173328487,-0.5847317894836447,-1.0432709352230034,1.521286601345805],[6.961171753003672,-4.589232487643439,-2.5690713388435253,2.220146623090038,-1.7612947133505403,5.356703852505565,0.43220311726930344,-5.999127675543921,6.35504970954032,-0.6905447079118975,-2.1208858610750094,-2.714256082504064]]},"bias_h":{"rows":12,"cols":1,"data":[[-4.347117402520502],[2.298559514204557],[-1.9721455605025473],[5.280159794060935],[-0.4989966935031369],[0.9743399043718002],[0.517946717128464],[3.949289073530554],[0.3993496249559444],[3.237543834287368],[1.2604502258437735],[2.9600708342838336]]},"bias_o":{"rows":4,"cols":1,"data":[[1.4400898487810805],[-0.8024907615401395],[-0.2818681688757031],[1.9244822204816536]]},"learning_rate":0.1,"activation_function":{}}';
