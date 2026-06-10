export class CreateSessionDTO {
  clientId!: number;
  categorieId?: number;
  sousCategorieId?: number;
}

export class AnswerQuestionDTO {
  questionId!: number;
  contenu!: string;
}

export class FillInfoRequiseDTO {
  infoRequiseId!: number;
  valeur!: string;
  unite?: string;
}

export class SelectOptionDTO {
  optionPrestationId!: number;
  choixOptionId!: number;
}

export class BulkAnswersDTO {
  reponses!: AnswerQuestionDTO[];
}

export class BulkFillInfoDTO {
  infos!: FillInfoRequiseDTO[];
}

export class BulkSelectOptionsDTO {
  selections!: SelectOptionDTO[];
}

export class GenerateDevisDTO {
  sessionDiagId!: number;
  notes?: string;
}
