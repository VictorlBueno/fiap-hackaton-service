import {ApiProperty} from "@nestjs/swagger";

export class ProcessingResult {
    constructor(
        success: boolean,
        message: string,
        zipPath?: string,
        frameCount?: number,
        images?: string[],
    ) {
        this.success = success;
        this.message = message;
        this.zipPath = zipPath;
        this.frameCount = frameCount;
        this.images = images;
    }

    private _success: boolean;

    @ApiProperty({
        description: 'Indica se o processamento foi bem-sucedido',
        example: true
    })
    get success(): boolean {
        return this._success;
    }

    set success(value: boolean) {
        this._success = value;
    }

    private _message: string;

    @ApiProperty({
        description: 'Mensagem do resultado do processamento',
        example: 'Processamento concluído! 120 frames extraídos.'
    })
    get message(): string {
        return this._message;
    }

    set message(value: string) {
        this._message = value;
    }

    private _zipPath?: string;

    @ApiProperty({
        description: 'Caminho do arquivo ZIP gerado',
        example: 'frames_20250628_143021.zip',
        required: false
    })
    get zipPath(): string | undefined {
        return this._zipPath;
    }

    set zipPath(value: string | undefined) {
        this._zipPath = value;
    }

    private _frameCount?: number;

    @ApiProperty({
        description: 'Número total de frames extraídos',
        example: 120,
        required: false
    })
    get frameCount(): number | undefined {
        return this._frameCount;
    }

    set frameCount(value: number | undefined) {
        this._frameCount = value;
    }

    private _images?: string[];

    @ApiProperty({
        description: 'Lista de nomes dos arquivos de imagem gerados',
        example: ['frame_0001.png', 'frame_0002.png'],
        type: [String],
        required: false
    })
    get images(): string[] | undefined {
        return this._images;
    }

    set images(value: string[] | undefined) {
        this._images = value;
    }
}